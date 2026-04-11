import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

/**
 * Socket.io middleware that verifies the JWT passed in socket.handshake.auth.token.
 * Attaches the decoded payload to socket.user on success.
 *
 * @param {import("socket.io").Socket} socket
 * @param {Function} next
 */
export function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    socket.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError" ? "Session expired" : "Invalid token";
    next(new Error(message));
  }
}
