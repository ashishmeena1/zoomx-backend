import {
  getRoomsByUser,
  createRoom,
  getRoomByCode,
  closeRoom,
} from "./rooms.service.js";

/**
 * GET /api/rooms
 * List all rooms owned by the authenticated user.
 */
export async function listRooms(req, res, next) {
  try {
    const rooms = await getRoomsByUser(req.user.id);
    res.status(200).json(rooms);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/rooms
 * Create a new meeting room.
 */
export async function createRoomHandler(req, res, next) {
  try {
    const room = await createRoom(req.user.id, req.body.name);
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/rooms/:code
 * Get a single room by its join code.
 * Used by guests to validate a join link before entering.
 */
export async function getRoomHandler(req, res, next) {
  try {
    const room = await getRoomByCode(req.params.code);
    res.status(200).json(room);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/rooms/:code
 * Close a room. Admin only.
 */
export async function closeRoomHandler(req, res, next) {
  try {
    await closeRoom(req.params.code, req.user.id);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
}
