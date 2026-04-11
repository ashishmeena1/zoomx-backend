# MeetSpace Backend

Production-grade Node.js backend for MeetSpace — a WebRTC video meeting app.

## Architecture

```
src/
├── config/
│   └── env.js                  # Zod-validated env vars — exits on invalid config
├── lib/
│   ├── logger.js               # Winston: pretty in dev, JSON in prod
│   └── prisma.js               # Singleton Prisma client with query logging
├── middleware/
│   ├── authenticate.js         # JWT auth (cookie or Authorization header)
│   ├── validate.js             # Zod request body + params validation
│   ├── rateLimiter.js          # Per-endpoint rate limits
│   ├── errorHandler.js         # Global 404 + error handler + createError()
│   └── requestId.js            # Attach X-Request-Id to every request
├── modules/
│   ├── auth/
│   │   ├── auth.schema.js      # Zod schemas
│   │   ├── auth.service.js     # Google OAuth verification, JWT signing
│   │   ├── auth.controller.js  # Express handlers
│   │   └── auth.router.js      # Express router
│   ├── rooms/
│   │   ├── rooms.schema.js     # Zod schemas
│   │   ├── rooms.service.js    # Business logic, DB calls
│   │   ├── rooms.controller.js # Express handlers
│   │   └── rooms.router.js     # Express router
│   └── socket/
│       ├── socket.state.js     # In-memory peer state per room
│       ├── socket.auth.js      # Socket.io JWT middleware
│       ├── socket.handlers.js  # All socket event handlers
│       └── socket.server.js    # Socket.io server factory
└── index.js                    # Entry point, server boot, graceful shutdown
```

## Setup

```bash
npm install
cp .env.example .env   # fill in all values
npx prisma db push     # create tables (dev)
npm run dev
```

## API Reference

### Auth
| Method | Path             | Auth | Description              |
|--------|------------------|------|--------------------------|
| POST   | /api/auth/google | No   | Google OAuth sign-in     |
| POST   | /api/auth/logout | No   | Clear JWT cookie         |
| GET    | /api/auth/me     | Yes  | Return current user      |

### Rooms
| Method | Path              | Auth  | Description              |
|--------|-------------------|-------|--------------------------|
| GET    | /api/rooms        | Yes   | List my rooms            |
| POST   | /api/rooms        | Yes   | Create a room            |
| GET    | /api/rooms/:code  | Yes   | Get room by code         |
| DELETE | /api/rooms/:code  | Admin | Close a room             |

### Health
| Method | Path    | Auth | Description                   |
|--------|---------|------|-------------------------------|
| GET    | /health | No   | DB ping + uptime (for LB/k8s) |

## Socket.io Events

### Client → Server
| Event           | Payload                          | Description                  |
|-----------------|----------------------------------|------------------------------|
| `join-room`     | `roomCode: string`               | Join a meeting room          |
| `offer`         | `{ to, offer }`                  | Send WebRTC offer            |
| `answer`        | `{ to, answer }`                 | Send WebRTC answer           |
| `ice-candidate` | `{ to, candidate }`              | Send ICE candidate           |
| `media-state`   | `{ muted, videoOff, screensharing }` | Broadcast media state    |

### Server → Client
| Event              | Payload                              | Description                |
|--------------------|--------------------------------------|----------------------------|
| `existing-peers`   | `PeerInfo[]`                         | Peers already in room      |
| `peer-joined`      | `PeerInfo`                           | A new peer joined          |
| `offer`            | `{ from, offer }`                    | Relayed WebRTC offer       |
| `answer`           | `{ from, answer }`                   | Relayed WebRTC answer      |
| `ice-candidate`    | `{ from, candidate }`                | Relayed ICE candidate      |
| `peer-media-state` | `{ socketId, muted, videoOff, screensharing }` | Peer toggled media |
| `peer-left`        | `{ socketId }`                       | A peer disconnected        |

## Rate Limits

| Scope          | Limit             |
|----------------|-------------------|
| All API routes | 120 req / 15 min  |
| Auth endpoints | 20 req / 15 min   |
| Create room    | 10 req / hour     |

## Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Set `COOKIE_SECURE=true` (requires HTTPS)
- [ ] Use a strong random `JWT_SECRET` (64+ chars)
- [ ] Run `npx prisma migrate deploy` (not db push)
- [ ] Set up a process manager (PM2 or systemd)
- [ ] Put Nginx in front for TLS termination
- [ ] Add a TURN server and configure it in the frontend `webrtc.js`
