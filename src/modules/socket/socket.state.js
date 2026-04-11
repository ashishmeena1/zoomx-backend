/**
 * In-memory state for active socket rooms.
 *
 * Structure:
 *   rooms: Map<roomCode, Map<socketId, PeerInfo>>
 *
 * @typedef {Object} PeerInfo
 * @property {string}      userId
 * @property {string}      name
 * @property {string|null} avatar
 * @property {boolean}     muted
 * @property {boolean}     videoOff
 * @property {boolean}     screensharing
 * @property {number}      joinedAt  - epoch ms
 */

/** @type {Map<string, Map<string, PeerInfo>>} */
const rooms = new Map();

export const roomState = {
  /**
   * Add a peer to a room. Creates the room entry if it does not exist.
   * @param {string} roomCode
   * @param {string} socketId
   * @param {Omit<PeerInfo, "muted"|"videoOff"|"screensharing"|"joinedAt">} info
   */
  addPeer(roomCode, socketId, info) {
    if (!rooms.has(roomCode)) rooms.set(roomCode, new Map());
    rooms.get(roomCode).set(socketId, {
      ...info,
      muted:        false,
      videoOff:     false,
      screensharing: false,
      joinedAt:     Date.now(),
    });
  },

  /**
   * Remove a peer from a room. Deletes the room entry if it becomes empty.
   * @param {string} roomCode
   * @param {string} socketId
   */
  removePeer(roomCode, socketId) {
    const room = rooms.get(roomCode);
    if (!room) return;
    room.delete(socketId);
    if (room.size === 0) rooms.delete(roomCode);
  },

  /**
   * Update a peer's media state.
   * @param {string} roomCode
   * @param {string} socketId
   * @param {{ muted?: boolean, videoOff?: boolean, screensharing?: boolean }} state
   */
  updatePeerState(roomCode, socketId, state) {
    const peer = rooms.get(roomCode)?.get(socketId);
    if (!peer) return;
    Object.assign(peer, state);
  },

  /**
   * Get all peers in a room as an array (excluding the requesting socket).
   * @param {string} roomCode
   * @param {string} [excludeSocketId]
   * @returns {Array<{ socketId: string } & PeerInfo>}
   */
  getPeers(roomCode, excludeSocketId) {
    const room = rooms.get(roomCode);
    if (!room) return [];
    return [...room.entries()]
      .filter(([sid]) => sid !== excludeSocketId)
      .map(([socketId, info]) => ({ socketId, ...info }));
  },

  /**
   * Get the number of peers in a room.
   * @param {string} roomCode
   * @returns {number}
   */
  peerCount(roomCode) {
    return rooms.get(roomCode)?.size ?? 0;
  },
};
