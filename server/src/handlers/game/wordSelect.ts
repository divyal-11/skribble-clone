import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../types/events.js";
import { selectWordInRoom } from "../../services/wordService.js";
import { startTurnTimer } from "../../services/timeServices.js";
import { getRoom } from "../../services/roomService.js";
import { getRoomPlayers } from "../../services/playerService.js";
import { redis } from "../../lib/redis.js";

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export function handleWordSelect(io: AppServer, socket: AppSocket) {
  const playerId = socket.data.playerId;

  socket.on("wordSelect", async ({ roomId, word }) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(`🎨 Word selected in room ${cleanRoomId}: "${word}" by ${playerId}`);

    const result = await selectWordInRoom(cleanRoomId, playerId, word);
    if (!result.success || !result.maskedWord || !result.word) {
      console.warn(`⚠️ Word selection failed: ${result.error}`);
      return;
    }

    const room = await getRoom(cleanRoomId);
    const duration = Number(room?.drawTime) || 60;
    const roundEndsAt = Date.now() + duration * 1000;

    // Persist turn deadline in Redis for cross-instance sync
    await redis.hset(`room:${cleanRoomId}`, "roundEndsAt", roundEndsAt.toString());
    await redis.del(`room:${cleanRoomId}:turnDeltas`);

    // Send full word to drawer
    socket.emit("wordChosen", {
      word: result.word,
      maskedWord: result.maskedWord,
      drawerId: playerId,
      roundEndsAt,
      duration,
    });

    // Broadcast masked word only to guessers
    socket.to(cleanRoomId).emit("wordChosen", {
      maskedWord: result.maskedWord,
      drawerId: playerId,
      roundEndsAt,
      duration,
    });

    const players = await getRoomPlayers(cleanRoomId);
    const drawer = players.find((p) => p.id === playerId);
    if (drawer) {
      io.to(cleanRoomId).emit("chatMessage", {
        senderId: "system",
        senderName: "System",
        text: `${drawer.name} is drawing now!`,
        type: "info",
      });
    }

    await startTurnTimer(io, cleanRoomId, duration);

    console.log(
      `📢 Broadcasted wordChosen (hint: "${result.maskedWord}", duration: ${duration}s) to room ${cleanRoomId}`
    );
  });
}
