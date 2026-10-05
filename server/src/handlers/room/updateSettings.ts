import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  RoomSettings,
} from "../../types/events.js";
import { getRoom, ROOM_TTL } from "../../services/roomService.js";
import { redis } from "../../lib/redis.js";

type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export function handleUpdateSettings(io: AppServer, socket: AppSocket) {
  const playerId = socket.data.playerId;

  socket.on("updateRoomSettings", async ({ roomId, settings }) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    const room = await getRoom(cleanRoomId);

    // Only host can modify lobby settings
    if (!room || room.hostId !== playerId) {
      return;
    }

    const patch: Record<string, string> = {};
    if (settings.drawTime !== undefined) patch.drawTime = settings.drawTime.toString();
    if (settings.rounds !== undefined) patch.totalRounds = settings.rounds.toString();
    if (settings.wordCount !== undefined) patch.wordCount = settings.wordCount.toString();
    if (settings.hints !== undefined) patch.hints = settings.hints.toString();
    if (settings.language !== undefined) patch.language = settings.language;
    if (settings.gameMode !== undefined) patch.gameMode = settings.gameMode;
    if (settings.teamCount !== undefined) patch.teamCount = settings.teamCount.toString();
    if (settings.maxPlayers !== undefined) patch.maxPlayers = settings.maxPlayers.toString();
    if (settings.customWordsOnly !== undefined) {
      patch.customWordsOnly = settings.customWordsOnly ? "true" : "false";
    }

    if (Object.keys(patch).length > 0) {
      await redis.hset(`room:${cleanRoomId}`, patch);
      await redis.expire(`room:${cleanRoomId}`, ROOM_TTL);
    }

    // Save custom words to wordpack set if provided
    if (settings.customWords !== undefined) {
      const wordpackKey = `room:${cleanRoomId}:wordpack`;
      await redis.del(wordpackKey);
      if (settings.customWords.trim().length > 0) {
        const parsedWords = settings.customWords
          .split(",")
          .map((w) => w.trim().toLowerCase())
          .filter((w) => w.length >= 1 && w.length <= 32);
        if (parsedWords.length > 0) {
          await redis.sadd(wordpackKey, ...parsedWords);
          await redis.expire(wordpackKey, ROOM_TTL);
        }
      }
    }

    const updated = await getRoom(cleanRoomId);
    const fullSettings: RoomSettings = {
      maxPlayers: updated?.maxPlayers || 8,
      drawTime: updated?.drawTime || 80,
      rounds: updated?.totalRounds || 3,
      hints: updated?.hints || 2,
      wordCount: updated?.wordCount || 3,
      language: updated?.language || "English",
      gameMode: updated?.gameMode || "Normal",
      teamCount: updated?.teamCount || 2,
      customWords: settings.customWords || "",
      customWordsOnly: updated?.customWordsOnly || false,
    };

    io.to(cleanRoomId).emit("roomSettingsUpdated", { settings: fullSettings });
  });
}
