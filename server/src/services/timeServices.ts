import { Server } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types/events.js";
import { getRoom } from "./roomService.js";
import { getRoomPlayers, resetPlayerGuessed } from "./playerService.js";
import { advanceTurnInRoom } from "./turnService.js";
import { clearRoomStrokes } from "./strokeService.js";
import { maskWord } from "../lib/words.js";
import { getWordOptionsForRoom } from "./wordService.js";
import { redis } from "../lib/redis.js";


type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

interface ActiveTimer {
  intervalId: NodeJS.Timeout;
  endsAt: number;
  duration: number;
  revealedIndices: number[];
  hint50Given: boolean;
  hint75Given: boolean;
  startScores?: Record<string, number>;
}

const activeTimers = new Map<string, ActiveTimer>();

/**
 * Returns remaining seconds on the clock for a room (0 if not running)
 */
export async function getRemainingTime(roomId: string): Promise<number> {
  const timer = activeTimers.get(roomId);

  if (timer) {
    return Math.max(0, Math.round((timer.endsAt - Date.now()) / 1000));
  }

  const endsAtRaw = await redis.hget(`room:${roomId}`, "roundEndsAt");
  if (!endsAtRaw) return 0;
  return Math.max(0, Math.round((parseInt(endsAtRaw, 10) - Date.now()) / 1000));
}


/**
 * Stops and clears any running timer for a room
 */
export function stopTurnTimer(roomId: string): void {
  const timer = activeTimers.get(roomId);
  if (timer) {
    clearInterval(timer.intervalId);
    activeTimers.delete(roomId);
  }
}



/**
 * Picks a random unrevealed letter and broadcasts the updated hint to guessers
 */
async function revealRandomHint(
  io: AppServer,
  roomId: string,
  timer: ActiveTimer
): Promise<void> {
  const room = await getRoom(roomId);
  if (!room || !room.currentWord || room.status !== "drawing") return;

  const word = room.currentWord;
  const unrevealedIndices: number[] = [];

  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    if (char !== " " && char !== "-" && !timer.revealedIndices.includes(i)) {
      unrevealedIndices.push(i);
    }
  }

  if (unrevealedIndices.length <= 1) return; // Leave at least 1 letter to guess

  const randomIndex = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
  timer.revealedIndices.push(randomIndex);

  const maskedWord = maskWord(word, timer.revealedIndices);
  const roomSockets = await io.in(roomId).fetchSockets();

  roomSockets.forEach((s) => {
    if (s.data.playerId !== room.currentDrawerId) {
      s.emit("hintRevealed", { maskedWord });
    }
  });

  console.log(`💡 Random hint revealed in ${roomId}: "${maskedWord}"`);
}

/**
 * Checks elapsed turn time and triggers hints at 50% and 75% thresholds
 */
function checkProgressiveHints(
  io: AppServer,
  roomId: string,
  timer: ActiveTimer,
  remaining: number
): void {
  const elapsed = (timer.duration - remaining) / timer.duration;

  if (elapsed >= 0.5 && !timer.hint50Given && remaining > 5) {
    timer.hint50Given = true;
    revealRandomHint(io, roomId, timer);
  } else if (elapsed >= 0.75 && !timer.hint75Given && remaining > 5) {
    timer.hint75Given = true;
    revealRandomHint(io, roomId, timer);
  }
}

/**
 * Starts the round countdown timer (ticks every sec, monitors hints)
 */
export async function startTurnTimer(
  io: AppServer,
  roomId: string,
  durationSeconds: number = 60
): Promise<void> {
  stopTurnTimer(roomId);
  const endsAt = Date.now() + durationSeconds * 1000;

  const currentPlayers = await getRoomPlayers(roomId);
  const startScores: Record<string, number> = {};
  currentPlayers.forEach((p) => {
    startScores[p.id] = p.score;
  });

  const intervalId = setInterval(async () => {
    const timer = activeTimers.get(roomId);
    if (!timer) return;

    const room = await getRoom(roomId);
    if (!room || room.status !== "drawing") {
      stopTurnTimer(roomId);
      return;
    }

    const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
    checkProgressiveHints(io, roomId, timer, remaining);

    if (remaining <= 0) {
      await handleTurnEnd(io, roomId);
    }
  }, 1000);

  activeTimers.set(roomId, {
    intervalId,
    endsAt,
    duration: durationSeconds,
    revealedIndices: [],
    hint50Given: false,
    hint75Given: false,
    startScores,
  });

  console.log(`⏱️ Turn timer started for room ${roomId}: ${durationSeconds}s`);
}

/**
 * Ends turn early (called when all guessers find the secret word)
 */
export async function triggerTurnEndEarly(
  io: AppServer,
  roomId: string
): Promise<void> {
  console.log(`⚡ All players guessed in ${roomId}! Triggering early turn end.`);
  await handleTurnEnd(io, roomId);
}

/**
 * Advances to the next turn or ends the match after intermission
 */
async function transitionToNextTurn(io: AppServer, roomId: string): Promise<void> {
  await resetPlayerGuessed(roomId);
  const nextTurn = await advanceTurnInRoom(roomId);

  if (nextTurn.gameOver) {
    await redis.hset(`room:${roomId}`, "status", "gameEnd");
    const finalPlayers = await getRoomPlayers(roomId);
    const finalScores: Record<string, number> = {};
    finalPlayers.forEach((p) => { finalScores[p.id] = p.score; });
    io.to(roomId).emit("gameEnded", { finalScores });
    console.log(`🏆 Game ended in room ${roomId}! Final scores:`, finalScores);
    return;
  }

  const players = await getRoomPlayers(roomId);
  const nextDrawer = players.find((p) => p.id === nextTurn.currentDrawerId);

  if (nextDrawer) {
    io.to(roomId).emit("choosingWord", {
      drawerId: nextDrawer.id,
      drawerName: nextDrawer.name,
    });

    const room = await getRoom(roomId);
    const wordOptions = await getWordOptionsForRoom(roomId, room?.wordCount || 3);
    const roomSockets = await io.in(roomId).fetchSockets();
    const drawerSocket = roomSockets.find((s) => s.data.playerId === nextTurn.currentDrawerId);
    drawerSocket?.emit("chooseWord", { options: wordOptions });

    console.log(
      `🎨 Next turn in ${roomId}: ${nextDrawer.name} (Round ${nextTurn.currentRound}/${nextTurn.totalRounds})`
    );
  }
}

/**
 * Handles turn wrap-up, canvas clear, and schedules 5s intermission
 */
export async function handleTurnEnd(
  io: AppServer,
  roomId: string
): Promise<void> {
  const timer = activeTimers.get(roomId);
  const startScores = timer?.startScores || {};
  stopTurnTimer(roomId);

  const room = await getRoom(roomId);
  const players = await getRoomPlayers(roomId);

  // Read recorded turn deltas from Redis
  const rawDeltas = await redis.hgetall(`room:${roomId}:turnDeltas`);
  const scoreDeltas: Record<string, number> = {};
  for (const [pId, val] of Object.entries(rawDeltas || {})) {
    const pts = parseInt(val, 10);
    if (pts > 0) scoreDeltas[pId] = pts;
  }

  const scores: Record<string, number> = {};
  players.forEach((p) => {
    scores[p.id] = p.score;
    if (!scoreDeltas[p.id]) {
      const delta = p.score - (startScores[p.id] ?? p.score);
      if (delta > 0) {
        scoreDeltas[p.id] = delta;
      }
    }
  });

  const revealedWord = room?.currentWord ?? "";

  const nonDrawers = players.filter((p) => p.id !== room?.currentDrawerId);
  const guessedCount = nonDrawers.filter((p) => p.hasGuessed).length;
  let reason = "Time's up!";
  if (nonDrawers.length > 0 && guessedCount === nonDrawers.length) {
    reason = "Everyone guessed the word!";
  } else if (guessedCount === 0) {
    reason = "Nobody guessed the word!";
  }

  io.to(roomId).emit("turnEnded", {
    word: revealedWord,
    scores,
    scoreDeltas,
    reason,
  });
  console.log(`🏁 Turn ended in ${roomId}. Word was: "${revealedWord}" (${reason})`);

  if (revealedWord) {
    io.to(roomId).emit("chatMessage", {
      senderId: "system",
      senderName: "System",
      text: `The word was '${revealedWord}'`,
      type: "system",
    });
  }

  await clearRoomStrokes(roomId);
  io.to(roomId).emit("drawData", { type: "clear", x: 0, y: 0 });

  // 5s scorecard intermission before next turn/round
  setTimeout(() => transitionToNextTurn(io, roomId), 5000);
}

/**
 * Returns the timestamp when the current turn ends (or null if not running)
 */
export function getRoundEndsAt(roomId: string): number | null {
  const timer = activeTimers.get(roomId);
  return timer ? timer.endsAt : null;
}

