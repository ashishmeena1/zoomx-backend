import { loginWithGoogle, cookieOptions } from "./auth.service.js";

/**
 * POST /api/auth/google
 * Verify Google credential, upsert user, set JWT cookie.
 *
 * FIX: Also return the token in the JSON body.
 * The frontend stores it in sessionStorage so the Socket.io handshake
 * can include it in socket.handshake.auth.token.
 * Without this, socket auth always fails (getStoredToken() returns null).
 */
export async function googleLogin(req, res, next) {
  try {
    const { user, token } = await loginWithGoogle(req.body.credential);
    res.cookie("token", token, cookieOptions());
    // Return token in body — frontend needs it for socket auth
    res.status(200).json({ user, token });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Clear the JWT cookie and sessionStorage token.
 */
export function logout(req, res) {
  res.clearCookie("token", cookieOptions());
  res.status(200).json({ ok: true });
}

/**
 * GET /api/auth/me
 * Return the authenticated user from the JWT payload.
 */
export function getMe(req, res) {
  const { id, email, name, avatar } = req.user;
  res.status(200).json({ user: { id, email, name, avatar } });
}
