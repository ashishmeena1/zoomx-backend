import { Server } from "socket.io";
import { env }    from "../../config/env.js";
import { socketAuth }       from "./socket.auth.js";
import { registerHandlers } from "./socket.handlers.js";
import logger from "../../lib/logger.js";

/**
 * Creates and configures the Socket.io server.
 *
 * @param {import("http").Server} httpServer
 * @returns {import("socket.io").Server}
 */
export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin:      env.allowedOrigins,
      credentials: true,
    },
    // Tuned for production — keep alive every 25s, drop after 20s no pong
    pingInterval:  25_000,
    pingTimeout:   20_000,
    // Only WebSocket transport in production for lower latency
    transports:    env.isProd ? ["websocket","polling"] : ["websocket", "polling"],
    // Limit event payload size
    maxHttpBufferSize: 1e5, // 100 KB
  });

  // ── Auth middleware ────────────────────────────────────────────────────────
  io.use(socketAuth);

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    logger.debug(`[socket] Connected: ${socket.id} (${socket.user?.name})`);
    registerHandlers(socket, io);
  });

  // ── Engine-level error ─────────────────────────────────────────────────────
  io.engine.on("connection_error", (err) => {
    logger.error("[socket] Engine connection error:", err);
  });

  return io;
}
