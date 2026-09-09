# 🎨 Skribbl.io Clone

A full-stack, real-time multiplayer drawing and guessing game built to deeply explore and master **WebSockets**, real-time state synchronization, and distributed event-driven architectures.

> 📖 **Architectural Blueprint:** Detailed system design, Redis data models, and day-by-day implementation roadmap are documented in [skribbl-clone-blueprint.md](./skribbl-clone-blueprint.md).

---

## 🚀 Why This Project?

Most WebSocket tutorials stop at basic chat apps. This project tackles the real engineering challenges of real-time multiplayer systems:

- **Server-Authoritative Game State:** The server is the single source of truth. The client only sends raw inputs (drawing strokes, guesses) and renders server-dictated state, preventing state desync and cheat exploits (like word-peeking).
- **Ephemeral State in Redis:** Rooms, player rosters, turn order, and active round state live in Redis with automatic TTLs, keeping the Node.js runtime lightweight and restart-resilient.
- **Stateless Timers:** Turn deadlines are stored as absolute timestamps (`roundEndsAt`) in Redis rather than fragile in-memory `setTimeout` handles, allowing games to survive server restarts mid-round.
- **Mid-Round Canvas Sync:** Round strokes are buffered as an append-only log in Redis (`canvasHistory`), ensuring reconnecting players or late joiners receive a clean, immediate canvas replay.
- **Concurrency & Race Conditions:** Atomic operations (`SADD`) prevent simultaneous guesses from creating double-scoring race conditions.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js, TypeScript, Tailwind CSS | Client interface, room lobby, game views |
| **Canvas** | Native HTML5 Canvas API | Raw coordinate tracking, normalized stroke rendering |
| **Real-time Layer** | Socket.IO | Bi-directional, event-driven WebSocket communication |
| **Backend Runtime** | Node.js, Express, TypeScript | Authoritative game engine & room management |
| **Ephemeral Cache** | Redis | Room state, players, word masks, turn timers, stroke log |
| **DevOps** | Docker & Docker Compose | Containerized local environment (App + Redis) |

---

## 📐 High-Level Architecture

```
┌─────────────────────────────────┐
│       Next.js Client            │
│ (React + Socket.IO + Canvas)    │
└────────────────┬────────────────┘
                 │ WebSocket (Socket.IO Events)
                 ▼
┌─────────────────────────────────┐
│      Node.js Game Server        │
│  (State Machine & Anti-Cheat)   │
└────────────────┬────────────────┘
                 │ Atomic Commands / Queries
                 ▼
┌─────────────────────────────────┐
│             Redis               │
│  (Room Hashes, Sets, Lists)     │
└─────────────────────────────────┘
```

---

## 🗺️ Roadmap & Progress

- [x] Architecture design, event catalog & Redis schema specification
- [ ] **Day 1–2:** Project setup, monorepo structure, shared types & room lobby system
- [ ] **Day 3–4:** Persistent identity, Redis data access layer & game state machine
- [ ] **Day 5–6:** Stateless turn timers, turn rotation & canvas drawing pipeline
- [ ] **Day 7–8:** Real-time guessing, atomic scoring & word bank integration
- [ ] **Day 9–11:** Interactive UI polish, anti-cheat hardening & lobby controls
- [ ] **Day 12–14:** Dockerization, cloud deployment & documentation

---

## 📄 License

MIT
