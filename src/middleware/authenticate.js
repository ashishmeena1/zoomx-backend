import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * Reads JWT from:
 *   1. Authorization: Bearer <token> header  (primary — always works cross-origin)
 *   2. httpOnly cookie named "token"          (fallback — may be blocked cross-origin)
 *
 * Header takes priority so that cross-origin requests from Vercel to Render
 * work regardless of browser cookie policy (Safari ITP, Brave shields, etc.)
 */
export function authenticate(req, res, next) {
  // Header first, cookie as fallback
  const token =
    req.headers.authorization?.replace(/^Bearer\s+/i, "") ??
    req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError" ? "Session expired — please sign in again" :
      err.name === "JsonWebTokenError" ? "Invalid token" :
      "Authentication failed";
    res.status(401).json({ error: message });
  }
}
