import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { redis } from "./lib/redis.js";
import cors from "cors";
import dotenv from "dotenv";
import { getRandomWords } from "./lib/words.js";
import {
  addPlayerToRoom,
  removePlayerFromRoom,
  generateRoomCode,
  startGameInRoom,
  selectWordInRoom,
} from "./lib/roomManager.js";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  Player,
} from "./types/events.js";

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

  socket.on("joinRoom", async ({ roomId, playerName }) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    const cleanPlayerName = playerName.trim() || "Anonymous";

    const player: Player = {
      id: playerId,
      name: cleanPlayerName,
      score: 0,
      hasGuessed: false,
      connected: true,
    };

    const { room, players } = await addPlayerToRoom(cleanRoomId, player);

    socket.join(cleanRoomId);
    socket.data.roomId = cleanRoomId;

    console.log(`👤 ${player.name} (${player.id}) joined room ${cleanRoomId}`);

    socket.emit("joinedRoom", {
      roomId: cleanRoomId,
      players,
      status: room.status,
      hostId: room.hostId,
    });

    socket.to(cleanRoomId).emit("playerJoined", { player });
  });
  // 2. Handle Explicit Leave Room
  socket.on("leaveRoom", async ({ roomId }) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(`👋 ${playerId} explicitly left room ${cleanRoomId}`);

    const { remainingPlayers, newHostId } = await removePlayerFromRoom(
      cleanRoomId,
      playerId,
    );
    socket.leave(cleanRoomId);
    socket.data.roomId = undefined;

    // Broadcast to remaining players in that room
    socket.to(cleanRoomId).emit("playerLeft", { playerId, newHostId });
  });

  // 3. Handle Start Game (Host only)
  socket.on("startGame", async ({ roomId }) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(
      `🎮 Start Game requested for room ${cleanRoomId} by ${playerId}`,
    );

    const result = await startGameInRoom(cleanRoomId, playerId);
    if (!result.success || !result.turnOrder || !result.currentDrawerId) {
      console.warn(
        `⚠️ Cannot start game in room ${cleanRoomId}: ${result.error}`,
      );
      return;
    }

    console.log(
      `🚀 Game started in room ${cleanRoomId}! First drawer: ${result.currentDrawerId}`,
    );

    // Broadcast gameStarted to all players in the room
    io.to(cleanRoomId).emit("gameStarted", {
      turnOrder: result.turnOrder,
      totalRounds: result.totalRounds || 3,
    });

    // Pick 3 random words for the drawer
    const wordOptions = getRandomWords(3);

    // Find the drawer's socket and send the options PRIVATELY
    const roomSockets = await io.in(cleanRoomId).fetchSockets();
    const drawerSocket = roomSockets.find(
      (s) => s.data.playerId === result.currentDrawerId,
    );

    if (drawerSocket) {
      drawerSocket.emit("chooseWord", { options: wordOptions });
      console.log(
        `📝 Sent 3 word options privately to drawer ${result.currentDrawerId}`,
      );
    }
  });

  //handle word selection
  socket.on("wordSelect", async ({ roomId, word }) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(
      `Word selected in room ${cleanRoomId}: "${word}" by ${playerId}`,
    );

    const result = await selectWordInRoom(cleanRoomId, playerId, word);

    if (!result.success || !result.maskedWord || !result.word) {
      console.warn(`⚠️ Word selection failed: ${result.error}`);
      return;
    }

    //send to drawer (includes the actual word to draw)
    socket.emit("wordChosen", {
      word: result.word,
      maskedWord: result.maskedWord,
      drawerId: playerId,
    });

    //broadcast to other players only masked strinf secret word stays hidden
    socket.to(cleanRoomId).emit("wordChosen", {
      maskedWord: result.maskedWord,
      drawerId: playerId,
    });

    console.log(
      `📢 Broadcasted wordChosen (hint: "${result.maskedWord}") to room ${cleanRoomId}`,
    );
  });

  // 4. Handle Disconnect
  socket.on("disconnect", async (reason) => {
    const currentRoomId = socket.data.roomId;
    console.log(`❌ Disconnected: socket=${socket.id} (Reason: ${reason})`);
    if (currentRoomId) {
      const { remainingPlayers, newHostId } = await removePlayerFromRoom(
        currentRoomId,
        playerId,
      );

      // Notify remaining players in the room
      socket.to(currentRoomId).emit("playerLeft", { playerId, newHostId });
      if (newHostId) {
        console.log(`👑 New host for room ${currentRoomId}: ${newHostId}`);
      }
    }
  });
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
