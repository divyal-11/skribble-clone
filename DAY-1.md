# 📘 Day 1: Architecture, Monorepo Setup & WebSocket Plumbing

---

## 🎯 1. Objective of Day 1

The primary goal of Day 1 was **not** to jump straight into game logic, but to build a robust, production-grade foundation:
1. **Monorepo Directory Layout**: Establish isolated `/server` and `/client` workspaces.
2. **Strict Event Contract**: Define all WebSocket event shapes upfront in TypeScript to eliminate runtime bugs and typos.
3. **Server Setup**: Boot a Node.js + Express HTTP server and attach a typed Socket.IO instance.
4. **Client Setup**: Scaffold Next.js App Router and implement client-side socket lifecycle management.
5. **Plumbing Checkpoint**: Verify the bidirectional connection with an end-to-end `ping` ➔ `pong` flow.
6. **Database Verification**: Ensure Redis is running and reachable for Day 2.

---

## 🏗️ 2. High-Level Architecture & Monorepo Structure

We adopted a **lightweight monorepo** pattern: both applications live inside a single Git repository without heavy, complex tooling like Turborepo or Nx.

```text
skribble-clone/                     <-- Git Root
├── .gitignore                      <-- Prevents node_modules & build leaks
├── README.md                       <-- Project overview & blueprint reference
├── skribbl-clone-blueprint.md      <-- Architectural blueprint & 14-day roadmap
├── DAY-1.md                        <-- Detailed Day 1 documentation (this file)
│
├── server/                         <-- Backend (Node.js + Express + Socket.IO)
│   ├── src/
│   │   ├── types/
│   │   │   └── events.ts           <-- Typed Event Contract (Backend)
│   │   └── index.ts                <-- Express + Socket.IO entry point
│   ├── tsconfig.json               <-- Modern NodeNext TypeScript config
│   └── package.json                <-- type: "module", tsx dev runner
│
└── client/                         <-- Frontend (Next.js 15+ App Router)
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx          <-- Root layout
    │   │   └── page.tsx            <-- Ping/Pong test page (use client)
    │   ├── lib/
    │   │   └── socket.ts           <-- Client Socket.IO singleton instance
    │   └── types/
    │       └── events.ts           <-- Typed Event Contract (Frontend)
    ├── tsconfig.json
    └── package.json
```

### Why a Monorepo for this project?
* **Atomic Commits**: Features spanning both client UI and backend socket handlers are committed together (e.g. `feat: add room lobby`).
* **Contract Alignment**: Easy to synchronize data models between client and server without publishing separate npm packages.

---

## 📜 3. The Typed Event Contract (`types/events.ts`)

In standard WebSocket development, events are loose strings:
```javascript
// ❌ Dangerous: Silent failure if there is a typo or missing property
socket.emit('joimRoom', { room_id: 'ABCD' });
```

We solved this before writing any code by defining explicit TypeScript interfaces:

```typescript
// Shared domain models
export interface Player {
  id: string;
  name: string;
  score: number;
  hasGuessed: boolean;
  connected: boolean;
}

export interface DrawStroke {
  type: 'start' | 'line' | 'clear';
  x: number;
  y: number;
  prevX?: number;
  prevY?: number;
  color?: string;
  size?: number;
}

// Client -> Server events (Actions player emits)
export interface ClientToServerEvents {
  joinRoom: (payload: { roomId: string; playerName: string }) => void;
  leaveRoom: (payload: { roomId: string }) => void;
  startGame: (payload: { roomId: string }) => void;
  wordSelect: (payload: { roomId: string; word: string }) => void;
  draw: (payload: { roomId: string } & DrawStroke) => void;
  clearCanvas: (payload: { roomId: string }) => void;
  guess: (payload: { roomId: string; text: string }) => void;
  ping: () => void;
}

// Server -> Client events (Broadcasts server emits)
export interface ServerToClientEvents {
  joinedRoom: (payload: { roomId: string; players: Player[]; status: string }) => void;
  playerJoined: (payload: { player: Player }) => void;
  playerLeft: (payload: { playerId: string }) => void;
  gameStarted: (payload: { turnOrder: string[]; totalRounds: number }) => void;
  chooseWord: (payload: { options: string[] }) => void;
  wordChosen: (payload: { maskedWord: string; drawerId: string; word?: string }) => void;
  drawData: (payload: DrawStroke) => void;
  canvasSync: (payload: { strokes: DrawStroke[] }) => void;
  guessResult: (payload: { playerId: string; correct: boolean; text?: string }) => void;
  scoreUpdate: (payload: { scores: Record<string, number> }) => void;
  turnEnded: (payload: { word: string; scores: Record<string, number> }) => void;
  gameEnded: (payload: { finalScores: Record<string, number> }) => void;
  pong: () => void;
}

// Session data attached to the active socket
export interface SocketData {
  playerId: string;
  roomId?: string; // Optional initially until room is joined
}
```

### Key Concept: Why `() => void`?
WebSocket events are **asynchronous and fire-and-forget**. The listener function executes when the packet arrives, but it does not return an immediate value to the emitter; hence its return type is `void`.

### Key Concept: Inverted Generics
* **Server**: `Server<ClientToServerEvents, ServerToClientEvents>`
* **Client**: `Socket<ServerToClientEvents, ClientToServerEvents>`
* **Why**: The server listens to `ClientToServer` and emits `ServerToClient`. The client does the exact inverse!

---

## ⚡ 4. Backend Implementation (`server/src/index.ts`)

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from './types/events.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Wrap Express in Node's native HTTP server
const httpServer = createServer(app);

// 2. Attach Socket.IO to the shared HTTP server with CORS
const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// 3. Health check route
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 4. Connection lifecycle
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Ping listener
  socket.on('ping', () => {
    console.log(`ping received from ${socket.id}`);
    socket.emit('pong');
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});
```

---

## 💻 5. Frontend Implementation (`client`)

### A. Socket Singleton (`client/src/lib/socket.ts`)
```typescript
import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/events';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000',
  {
    autoConnect: false, // Prevents automatic SSR connection issues in Next.js
  }
);
```

### B. Connection & Cleanup (`client/src/app/page.tsx`)
```tsx
'use client';

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [pongReceived, setPongReceived] = useState(0);

  useEffect(() => {
    // 1. Initiate connection when the component mounts in the browser
    socket.connect();

    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }
    function onPong() {
      setPongReceived((prev) => prev + 1);
    }

    // 2. Register socket event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('pong', onPong);

    // 3. CLEANUP FUNCTION: Runs when component unmounts
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('pong', onPong);
      socket.disconnect();
    };
  }, []);

  const sendPing = () => {
    socket.emit('ping');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-zinc-950 text-white font-mono">
      <h1 className="text-3xl font-bold mb-6">🎨 Skribbl Clone — Day 1</h1>
      <div className="flex items-center gap-3 mb-8 bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-full">
        <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
        <span>Status: {isConnected ? 'Connected to Server' : 'Disconnected'}</span>
      </div>
      <button
        onClick={sendPing}
        disabled={!isConnected}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white font-semibold rounded-lg shadow transition"
      >
        Send Ping 🏓
      </button>
      {pongReceived > 0 && (
        <p className="mt-6 text-emerald-400">✅ Pong received from server! (Count: {pongReceived})</p>
      )}
    </main>
  );
}
```

---

## 🔄 6. End-to-End Pipeline Flows

### Flow 1: Connection & Protocol Upgrade
```text
Browser (Next.js :3000)                             Server (Node.js :4000)
       |                                                    |
       |  1. GET /socket.io/?EIO=4&transport=polling       |
       |--------------------------------------------------->|
       |  2. HTTP 200 OK (handshake with sid & pingInterval)|
       |<---------------------------------------------------|
       |                                                    |
       |  3. GET /socket.io/?EIO=4&transport=websocket      |
       |     [Upgrade: websocket, Connection: Upgrade]      |
       |--------------------------------------------------->|
       |  4. HTTP 101 Switching Protocols                   |
       |<---------------------------------------------------|
       |                                                    |
       |  ====== Persistent TCP WebSocket Open ======      |
       |                                                    |
       |  5. Event: 'connect' triggered                     |
       |     setIsConnected(true)                           |
```

---

### Flow 2: Ping / Pong Event Exchange
```text
Client (page.tsx)                                   Server (index.ts)
       |                                                    |
[User clicks "Send Ping 🏓"]                                |
       |                                                    |
       |  1. socket.emit('ping')                            |
       |--------------------------------------------------->|
       |                                                    | socket.on('ping', () => {
       |                                                    |   console.log("Ping received...");
       |                                                    |   socket.emit('pong');
       |  2. socket.emit('pong')                            | })
       |<---------------------------------------------------|
socket.on('pong', () => {                                   |
  setPongReceived(prev + 1);                                |
})                                                          |
```

---

### Flow 3: The React Lifecycle & Ghost Listener Prevention
```text
Component Mounts
      │
      ▼
socket.connect()
socket.on('pong', onPong) ───► [Listener Attached]
      │
      │ (User navigates away or hot-reload triggers)
      ▼
Cleanup Function Runs (return () => { ... })
      │
      ├─► socket.off('pong', onPong) ───► [Listener Removed!]
      └─► socket.disconnect()        ───► [Clean Socket Teardown]

💡 If socket.off(...) was omitted:
Mount 1: 1 listener  ➔ Ping = 1 Pong
Mount 2: 2 listeners ➔ Ping = 2 Pongs
Mount 3: 3 listeners ➔ Ping = 3 Pongs (Memory Leak!)
```

---

## ⚠️ 7. Traps Encountered & Resolved

| Problem / Trap | Root Cause | Resolution |
|---|---|---|
| **`port is already allocated: 6379`** | An existing project container (`real-time-device-status-api-redis-1`) was already occupying port 6379. | Tested with `redis-cli ping` ➔ received `PONG`. Confirmed Redis is already active and ready. |
| **`tsc --init` deprecation warning** | Global `tsc` package resolution conflict. | Installed `typescript` locally and ran `npx tsc --init`. |
| **Pasting duplicates in `package.json`** | Multiple outer braces pasted inside JSON. | Formatted and validated clean JSON structure. |
| **Untracked `server/` on Git staging** | Ran `git add .` while inside the `client/` subdirectory. | Navigated to workspace root `cd ..` and staged everything together. |
| **Risk of committing `node_modules`** | No root `.gitignore` existed. | Created `.gitignore` in workspace root ignoring `node_modules/`, `.next/`, `dist/`, and `.env*`. |

---

## 🏁 Day 1 Checkpoint Summary
- [x] Monorepo structure operational (`/server` on 4000, `/client` on 3000)
- [x] TypeScript contracts matching between both projects
- [x] Bi-directional event exchange verified (`ping` ➔ `pong`)
- [x] Redis container verified on port 6379
- [x] Clean commit pushed to GitHub: `commit 997b480`
