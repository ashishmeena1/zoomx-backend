import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";
import logger from "./logger.js";

const globalForPrisma = globalThis;

// Singleton — prevent multiple instances during hot reload in dev
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDev
      ? [
          { emit: "event", level: "query" },
          { emit: "event", level: "warn" },
          { emit: "event", level: "error" },
        ]
      : [{ emit: "event", level: "error" }],
  });

if (env.isDev) {
  prisma.$on("query", (e) => logger.debug(`[DB] ${e.query} (${e.duration}ms)`));
  prisma.$on("warn",  (e) => logger.warn(`[DB] ${e.message}`));
}

prisma.$on("error", (e) => logger.error(`[DB] ${e.message}`));

if (env.isDev) globalForPrisma.prisma = prisma;

export default prisma;
