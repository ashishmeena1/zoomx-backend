import winston from "winston";
import { env } from "../config/env.js";

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const extras = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
    return stack
      ? `${timestamp} ${level}: ${message}\n${stack}${extras}`
      : `${timestamp} ${level}: ${message}${extras}`;
  })
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

const logger = winston.createLogger({
  level: env.isProd ? "warn" : "debug",
  format: env.isProd ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    // Uncomment for file logging in production:
    // new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    // new winston.transports.File({ filename: "logs/combined.log" }),
  ],
  exitOnError: false,
});

export default logger;
