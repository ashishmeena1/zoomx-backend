import rateLimit from "express-rate-limit";

const defaultOptions = {
  standardHeaders: true,
  legacyHeaders:   false,
  skipSuccessfulRequests: false,
};

/**
 * General API rate limiter: 120 requests per 15 minutes per IP.
 */
export const apiLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 15 * 60 * 1000,
  max:      120,
  message:  { error: "Too many requests. Please try again later." },
});

/**
 * Strict auth limiter: 20 requests per 15 minutes per IP.
 * Applied to login/signup endpoints.
 */
export const authLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { error: "Too many authentication attempts. Please try again later." },
});

/**
 * Room creation limiter: 10 rooms per hour per IP.
 */
export const createRoomLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000,
  max:      10,
  message:  { error: "Room creation limit reached. Please try again in an hour." },
});
