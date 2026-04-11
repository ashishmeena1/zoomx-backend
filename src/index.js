// Must be first — validates all env vars before anything else loads
import { env } from "./config/env.js";

import express      from "express";
import cors         from "cors";
import helmet       from "helmet";
import cookieParser from "cookie-parser";
import morgan       from "morgan";
import { createServer } from "http";

import authRouter  from "./modules/auth/auth.router.js";
import roomsRouter from "./modules/rooms/rooms.router.js";
import { createSocketServer } from "./modules/socket/socket.server.js";
import { apiLimiter }         from "./middleware/rateLimiter.js";
import { requestId }          from "./middleware/requestId.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import logger  from "./lib/logger.js";
import prisma  from "./lib/prisma.js";

// ── Express app ───────────────────────────────────────────────────────────────
const app        = express();
const httpServer = createServer(app);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    // Allow cross-origin resource loading (needed for fonts/images from CDN)
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Only enforce CSP in production
    contentSecurityPolicy: env.isProd,
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server (no origin) and requests from allowed origins
      if (!origin || env.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin "${origin}" is not allowed`));
    },
    credentials:     true,
    allowedHeaders:  ["Content-Type", "Authorization", "X-Request-Id"],
    exposedHeaders:  ["X-Request-Id"],
  })
);

// ── Trust proxy (for correct IP behind Nginx / load balancers) ───────────────
if (env.isProd) app.set("trust proxy", 1);

// ── General middleware ────────────────────────────────────────────────────────
app.use(requestId);
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());
app.use(
  morgan(env.isProd ? "combined" : "dev", {
    stream: { write: (msg) => logger.info(msg.trim()) },
    // Skip health-check noise in logs
    skip: (req) => req.path === "/health",
  })
);

// ── Health check (no auth, no rate limit) ────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status:    "ok",
      timestamp: new Date().toISOString(),
      uptime:    process.uptime(),
      env:       env.nodeEnv,
    });
  } catch (err) {
    logger.error("Health check DB error:", err);
    res.status(503).json({
      status:  "error",
      message: "Database unreachable",
    });
  }
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api",         apiLimiter);
app.use("/api/auth",    authRouter);
app.use("/api/rooms",   roomsRouter);

// ── 404 + error handler ───────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Socket.io ─────────────────────────────────────────────────────────────────
createSocketServer(httpServer);

// ── Start listening ───────────────────────────────────────────────────────────
httpServer.listen(env.port, () => {
  logger.info(
    `🚀 MeetSpace backend running on port ${env.port} [${env.nodeEnv}]`
  );
  logger.info(
    `   Allowed origins: ${env.allowedOrigins.join(", ")}`
  );
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const SHUTDOWN_TIMEOUT_MS = 10_000;

async function shutdown(signal) {
  logger.info(`Received ${signal} — shutting down gracefully…`);

  // Stop accepting new connections
  httpServer.close(async () => {
    logger.info("HTTP server closed");
    try {
      await prisma.$disconnect();
      logger.info("Database disconnected");
    } catch (err) {
      logger.error("Error disconnecting DB:", err);
    }
    logger.info("Shutdown complete");
    process.exit(0);
  });

  // Force-kill if graceful shutdown takes too long
  setTimeout(() => {
    logger.error("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception:", err);
  process.exit(1); // always exit on uncaught — let process manager restart
});

export { app, httpServer };
