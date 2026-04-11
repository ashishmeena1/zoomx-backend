import { nanoid } from "nanoid";
import prisma from "../../lib/prisma.js";
import logger from "../../lib/logger.js";
import { createError } from "../../middleware/errorHandler.js";

/** Characters safe for room codes (no confusable chars like 0/O, 1/l) */
const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

/**
 * Generates a human-readable room code: "abc-defg-hij"
 * Uses a restricted alphabet to avoid ambiguous characters.
 * Retries up to 5 times to guarantee uniqueness.
 *
 * @returns {Promise<string>}
 */
async function generateUniqueCode() {
  for (let i = 0; i < 5; i++) {
    const raw  = nanoid(10).split("").map((c) => CODE_CHARS[c.charCodeAt(0) % CODE_CHARS.length]).join("");
    const code = `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
    const exists = await prisma.room.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  throw createError(500, "Failed to generate a unique room code. Please try again.");
}

const ROOM_SELECT = {
  id:        true,
  code:      true,
  name:      true,
  active:    true,
  createdAt: true,
};

const ROOM_WITH_ADMIN_SELECT = {
  ...ROOM_SELECT,
  admin: {
    select: { id: true, name: true, avatar: true },
  },
};

/**
 * Fetch all rooms owned by a user, newest first.
 * @param {string} userId
 */
export async function getRoomsByUser(userId) {
  return prisma.room.findMany({
    where:   { adminId: userId },
    orderBy: { createdAt: "desc" },
    select:  ROOM_SELECT,
  });
}

/**
 * Create a new active room.
 * @param {string} userId
 * @param {string} name
 */
export async function createRoom(userId, name) {
  const code = await generateUniqueCode();
  const room = await prisma.room.create({
    data:   { code, name, adminId: userId },
    select: ROOM_SELECT,
  });
  logger.info(`Room created: ${room.code} by user ${userId}`);
  return room;
}

/**
 * Fetch a single active room by code.
 * Throws 404 if not found or inactive.
 * @param {string} code
 */
export async function getRoomByCode(code) {
  const room = await prisma.room.findUnique({
    where:  { code },
    select: ROOM_WITH_ADMIN_SELECT,
  });
  if (!room || !room.active) {
    throw createError(404, "Room not found or has been closed");
  }
  return room;
}

/**
 * Close a room. Only the admin can close it.
 * @param {string} code
 * @param {string} requestingUserId
 */
export async function closeRoom(code, requestingUserId) {
  const room = await prisma.room.findUnique({
    where:  { code },
    select: { id: true, adminId: true, active: true },
  });

  if (!room)        throw createError(404, "Room not found");
  if (!room.active) throw createError(409, "Room is already closed");
  if (room.adminId !== requestingUserId) {
    throw createError(403, "Only the room admin can close the meeting");
  }

  await prisma.room.update({
    where: { code },
    data:  { active: false },
  });
  logger.info(`Room closed: ${code} by user ${requestingUserId}`);
}
