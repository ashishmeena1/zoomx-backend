import logger from "../lib/logger.js";
import { env } from "../config/env.js";

/**
 * 404 catch-all — must be registered after all routes.
 * @type {import("express").RequestHandler}
 */
export function notFound(req, res) {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
  });
}

/**
 * Global error handler — must have exactly 4 params for Express to treat it as an error handler.
 * @type {import("express").ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  // Resolve HTTP status
  const status = err.status ?? err.statusCode ?? 500;

  // Log server errors fully, client errors briefly
  if (status >= 500) {
    logger.error({
      message: err.message,
      stack:   err.stack,
      method:  req.method,
      path:    req.path,
      ip:      req.ip,
    });
  } else {
    logger.warn(`[${status}] ${req.method} ${req.path} — ${err.message}`);
  }

  const body = {
    error: status < 500 ? err.message : "Internal server error",
  };

  // Expose stack trace in development only
  if (env.isDev && status >= 500) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
}

/**
 * Convenience: create an HTTP error with a specific status code.
 * @param {number} status
 * @param {string} message
 */
export function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
