/**
 * @typedef {Object} JwtPayload
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {string|null} avatar
 * @property {number} iat
 * @property {number} exp
 */

/**
 * @typedef {import("express").Request & { user: JwtPayload }} AuthRequest
 */

export {};
