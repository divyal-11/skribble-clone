import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { redis } from "./lib/redis.js";
import { generateRoomCode } from "./services/roomService.js";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./types/events.js";
import { registerRoomHandlers } from "./handlers/room/index.js";
import { registerGameHandlers } from "./handlers/game/index.js";
import { registerDrawHandlers } from "./handlers/draw/index.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/create-room", (_req, res) => {
  const roomId = generateRoomCode();
  res.json({ roomId });
});

io.on("connection", (socket) => {
  const playerId = (socket.handshake.auth?.playerId as string) || socket.id;
  socket.data.playerId = playerId;

  console.log(`Connected: socket_id=${socket.id} | player_id=${playerId}`);

  // Register domain handlers (clean, modular, zero-scroll)
  registerRoomHandlers(io, socket);
  registerGameHandlers(io, socket);
  registerDrawHandlers(io, socket);
});

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, async () => {
  console.log(`Server running on port: ${PORT}`);

  try {
    const pong = await redis.ping();
    console.log(`Redis is ready and responding: ${pong}`);
  } catch (err) {
    console.error("Failed to connect to redis");
  }
});
