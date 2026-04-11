import { roomState } from "./socket.state.js";
import logger from "../../lib/logger.js";

const ROOM_CODE_RE = /^[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/;

/**
 * Registers all event handlers for a connected socket.
 *
 * @param {import("socket.io").Socket} socket
 * @param {import("socket.io").Server} io
 */
export function registerHandlers(socket, io) {
  const { user } = socket;

  // ── join-room ──────────────────────────────────────────────────────────────
  socket.on("join-room", (roomCode) => {
    if (typeof roomCode !== "string" || !ROOM_CODE_RE.test(roomCode)) {
      socket.emit("error", { message: "Invalid room code" });
      return;
    }

    socket.join(roomCode);
    socket.roomCode = roomCode;

    // Store peer in state
    roomState.addPeer(roomCode, socket.id, {
      userId: user.id,
      name:   user.name,
      avatar: user.avatar ?? null,
    });

    // Send the existing peers (excluding self) to the newcomer
    const existingPeers = roomState.getPeers(roomCode, socket.id);
    socket.emit("existing-peers", existingPeers);

    // Announce newcomer to everyone else in the room
    socket.to(roomCode).emit("peer-joined", {
      socketId:     socket.id,
      userId:       user.id,
      name:         user.name,
      avatar:       user.avatar ?? null,
      muted:        false,
      videoOff:     false,
      screensharing: false,
    });

    logger.debug(
      `[socket] ${user.name} joined room ${roomCode} (${roomState.peerCount(roomCode)} peers)`
    );
  });

  // ── WebRTC signaling ───────────────────────────────────────────────────────

  socket.on("offer", ({ to, offer }) => {
    if (!to || !offer) return;
    io.to(to).emit("offer", { from: socket.id, offer });
  });

  socket.on("answer", ({ to, answer }) => {
    if (!to || !answer) return;
    io.to(to).emit("answer", { from: socket.id, answer });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    if (!to || !candidate) return;
    io.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });

  // ── media-state ────────────────────────────────────────────────────────────
  socket.on("media-state", (state) => {
    const { roomCode } = socket;
    if (!roomCode) return;

    const update = {
      muted:        Boolean(state?.muted),
      videoOff:     Boolean(state?.videoOff),
      screensharing: Boolean(state?.screensharing),
    };

    roomState.updatePeerState(roomCode, socket.id, update);

    socket.to(roomCode).emit("peer-media-state", {
      socketId: socket.id,
      ...update,
    });
  });

  // ── disconnect ─────────────────────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    const { roomCode } = socket;
    logger.debug(`[socket] ${user.name} disconnected (${reason})`);

    if (roomCode) {
      roomState.removePeer(roomCode, socket.id);
      socket.to(roomCode).emit("peer-left", { socketId: socket.id });
    }
  });

  // ── error ──────────────────────────────────────────────────────────────────
  socket.on("error", (err) => {
    logger.error(`[socket] Error from ${user?.name ?? socket.id}:`, err);
  });
}
