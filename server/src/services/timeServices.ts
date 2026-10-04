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
import { getRandomWords, maskWord } from "../lib/words.js";

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
}

const activeTimers = new Map<string, ActiveTimer>();

/**
 * Returns remaining seconds on the clock for a room (0 if not running)
 */
export function getRemainingTime(roomId: string): number {
  const timer = activeTimers.get(roomId);
  if (!timer) return 0;
  return Math.max(0, Math.round((timer.endsAt - Date.now()) / 1000));
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
export function startTurnTimer(
  io: AppServer,
  roomId: string,
  durationSeconds: number = 60
): void {
  stopTurnTimer(roomId);
  const endsAt = Date.now() + durationSeconds * 1000;

  const intervalId = setInterval(async () => {
    const timer = activeTimers.get(roomId);
    if (!timer) return;

    const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
    checkProgressiveHints(io, roomId, timer, remaining);

    if (remaining <= 0) {
      stopTurnTimer(roomId);
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
  stopTurnTimer(roomId);
  await handleTurnEnd(io, roomId);
}

/**
 * Advances to the next turn or ends the match after intermission
 */
async function transitionToNextTurn(io: AppServer, roomId: string): Promise<void> {
  await resetPlayerGuessed(roomId);
  const nextTurn = await advanceTurnInRoom(roomId);

  if (nextTurn.gameOver) {
    const finalPlayers = await getRoomPlayers(roomId);
    const finalScores: Record<string, number> = {};
    finalPlayers.forEach((p) => { finalScores[p.id] = p.score; });
    io.to(roomId).emit("gameEnded", { finalScores });
    console.log(`🏆 Game ended in room ${roomId}!`);
    return;
  }

  const players = await getRoomPlayers(roomId);
  const nextDrawer = players.find((p) => p.id === nextTurn.currentDrawerId);

  if (nextDrawer) {
    io.to(roomId).emit("choosingWord", {
      drawerId: nextDrawer.id,
      drawerName: nextDrawer.name,
    });

    const wordOptions = getRandomWords(3);
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
  stopTurnTimer(roomId);

  const room = await getRoom(roomId);
  const players = await getRoomPlayers(roomId);

  const scores: Record<string, number> = {};
  players.forEach((p) => { scores[p.id] = p.score; });

  const revealedWord = room?.currentWord ?? "";
  io.to(roomId).emit("turnEnded", { word: revealedWord, scores });
  console.log(`🏁 Turn ended in ${roomId}. Word was: "${revealedWord}"`);

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

