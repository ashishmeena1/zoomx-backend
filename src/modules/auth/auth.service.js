import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma.js";
import logger from "../../lib/logger.js";
import { env } from "../../config/env.js";
import { createError } from "../../middleware/errorHandler.js";

const googleClient = new OAuth2Client(env.googleClientId);

/**
 * Verifies a Google credential token and upserts the user in the database.
 * Returns the user record + a signed JWT.
 *
 * @param {string} credential  - The Google ID token from the frontend
 * @returns {Promise<{ user: object, token: string }>}
 */
export async function loginWithGoogle(credential) {
  // 1. Verify the Google token
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken:  credential,
      audience: env.googleClientId,
    });
    payload = ticket.getPayload();
  } catch (err) {
    logger.warn("Google token verification failed:", err.message);
    throw createError(401, "Invalid Google credential");
  }

  if (!payload) throw createError(401, "Empty Google token payload");

  const { sub: googleId, email, name, picture: avatar } = payload;

  if (!googleId || !email) {
    throw createError(401, "Incomplete Google profile");
  }

  // 2. Upsert user
  const user = await prisma.user.upsert({
    where:  { googleId },
    update: { name, avatar: avatar ?? null },
    create: { googleId, email, name, avatar: avatar ?? null },
    select: { id: true, email: true, name: true, avatar: true },
  });

  logger.info(`User authenticated: ${user.email}`);

  // 3. Sign JWT
  const token = signToken(user);

  return { user, token };
}

/**
 * Signs a JWT for the given user.
 * @param {{ id: string, email: string, name: string, avatar: string|null }} user
 * @returns {string}
 */
export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

/**
 * Cookie options for the JWT cookie.
 * @returns {import("express").CookieOptions}
 */
export function cookieOptions() {
  return {
    httpOnly: true,
    secure:   env.cookie.secure,
    sameSite: env.cookie.sameSite,
    maxAge:   7 * 24 * 60 * 60 * 1000, 
    ...(env.cookie.domain ? { domain: env.cookie.domain } : {}),
  };
}
