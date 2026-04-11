import { randomUUID } from "crypto";

/**
 * Attaches a unique request ID to every request/response.
 * Useful for correlating logs with specific requests.
 * @type {import("express").RequestHandler}
 */
export function requestId(req, res, next) {
  const id = req.headers["x-request-id"] ?? randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
}
