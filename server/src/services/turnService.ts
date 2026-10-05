import { redis } from "../lib/redis.js";
import { getRoom, ROOM_TTL } from "./roomService.js";
import { getRoomPlayers, resetAllPlayerScores } from "./playerService.js";
import { RoomSettings } from "../types/events.js";

/**
 * Starts a game: validates host, resets scores, shuffles turn order, and updates Redis
 */
export async function startGameInRoom(
  roomId: string,
  hostId: string,
  settings?: RoomSettings,
): Promise<{
  success: boolean;
  error?: string;
  turnOrder?: string[];
  currentDrawerId?: string;
  totalRounds?: number;
  drawTime?: number;
  wordCount?: number;
}> {
  const room = await getRoom(roomId);
  if (!room) {
    return { success: false, error: "Room does not exist" };
  }

  // 1. Host Authorization Check
  if (room.hostId !== hostId) {
    return { success: false, error: "Only the host can start the game" };
  }

  // 2. Minimum 2 Players Check
  const players = await getRoomPlayers(roomId);
  const connectedPlayers = players.filter((p) => p.connected);
  if (connectedPlayers.length < 2) {
    return { success: false, error: "Need at least 2 connected players to start" };
  }

  // 3. Reset all scores and turn deltas for a clean match/Play Again
  await resetAllPlayerScores(roomId);
  await redis.del(`room:${roomId}:turnDeltas`);

  // 4. Establish Turn Order (shuffled connected player IDs)
  const turnOrder = connectedPlayers.map((p) => p.id).sort(() => 0.5 - Math.random());
  const currentDrawerId = turnOrder[0];

  // 4. Extract and normalize settings
  const totalRounds = settings?.rounds || room.totalRounds || 3;
  const drawTime = settings?.drawTime || room.drawTime || 60;
  const wordCount = settings?.wordCount || room.wordCount || 3;
  const hints = settings?.hints ?? room.hints ?? 2;
  const customWordsOnly = settings?.customWordsOnly ?? false;


  // 5. Store Custom Words in Redis Set if provided
  const wordpackKey = `room:${roomId}:wordpack`;
  await redis.del(wordpackKey);

  if (settings?.customWords && settings.customWords.trim().length > 0) {
    const parsedWords = settings.customWords
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length >= 1 && w.length <= 32);
    if (parsedWords.length > 0) {
      await redis.sadd(wordpackKey, ...parsedWords);
      await redis.expire(wordpackKey, ROOM_TTL);
      console.log(`📦 Loaded ${parsedWords.length} custom words for room ${roomId}`);
    }
  }


  // 4. Update Redis State
  const roomKey = `room:${roomId}`;
  await redis.hset(roomKey, {
    status: "choosing",
    currentRound: "1",
    totalRounds: totalRounds.toString(),
    drawTime: drawTime.toString(),
    wordCount: wordCount.toString(),
    hints: hints.toString(),
    customWordsOnly: customWordsOnly ? "true" : "false",
    turnOrder: JSON.stringify(turnOrder),
    turnIndex: "0",
    currentDrawerId: currentDrawerId,
  });
  await redis.expire(roomKey, ROOM_TTL);

  return {
    success: true,
    turnOrder,
    currentDrawerId,
    totalRounds,
    drawTime,
    wordCount,
  };
}

export async function advanceTurnInRoom(roomId: string): Promise<{
  gameOver: boolean;
  currentDrawerId?: string;
  currentRound?: number;
  totalRounds?: number;
}> {
  const roomKey = `room:${roomId}`;
  const data = await redis.hgetall(roomKey);
  if (!data || !data.turnOrder) return { gameOver: true };

  const turnOrder = JSON.parse(data.turnOrder) as string[];
  const totalRounds = parseInt(data.totalRounds || "3", 10);
  let currentRound = parseInt(data.currentRound || "1", 10);
  let turnIndex = parseInt(data.turnIndex || "0", 10) + 1;

  const players = await getRoomPlayers(roomId);
  const connectedPlayers = players.filter((p) => p.connected);

  if (connectedPlayers.length < 2) {
    console.warn(`⚠️ Fewer than 2 connected players in room ${roomId}. Ending game.`);
    await redis.hset(roomKey, "status", "waiting");
    return { gameOver: true };
  }

  let attempts = 0;
  const maxAttempts = turnOrder.length * (totalRounds - currentRound + 2);
  let selectedDrawerId: string | null = null;

  while (attempts < maxAttempts) {
    if (turnIndex >= turnOrder.length) {
      turnIndex = 0;
      currentRound += 1;
    }

    if (currentRound > totalRounds) {
      await redis.hset(roomKey, "status", "gameEnd");
      return {
        gameOver: true,
        totalRounds,
        currentRound,
      };
    }

    const candidateId = turnOrder[turnIndex];
    const candidate = players.find((p) => p.id === candidateId);

    if (candidate && candidate.connected) {
      selectedDrawerId = candidateId;
      break;
    } else {
      console.log(
        `⏩ Skipping absent/disconnected drawer ${candidateId} in room ${roomId} (Round ${currentRound}/${totalRounds}).`
      );
      turnIndex += 1;
      attempts += 1;
    }
  }

  if (!selectedDrawerId) {
    console.warn(`⚠️ No connected drawer found in turnOrder for room ${roomId}. Ending game.`);
    await redis.hset(roomKey, "status", "gameEnd");
    return { gameOver: true };
  }

  // Save the new state
  await redis.hset(roomKey, {
    status: "choosing",
    currentRound: currentRound.toString(),
    turnIndex: turnIndex.toString(),
    currentDrawerId: selectedDrawerId,
    currentWord: "",
  });

  await redis.expire(roomKey, ROOM_TTL);

  return {
    gameOver: false,
    currentDrawerId: selectedDrawerId,
    currentRound,
    totalRounds,
  };
}
