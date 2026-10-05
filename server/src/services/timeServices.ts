import { Server } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  Player,
} from "../types/events.js";
import { getRoom } from "./roomService.js";
import { getRoomPlayers, resetPlayerGuessed } from "./playerService.js";
import { advanceTurnInRoom } from "./turnService.js";
import { clearRoomStrokes } from "./strokeService.js";
import { maskWord } from "../lib/words.js";
import { getWordOptionsForRoom, selectWordInRoom } from "./wordService.js";
import { getTeamScores } from "./teamService.js";
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

interface ChoiceTimer {
  timeoutId: NodeJS.Timeout;
  endsAt: number;
  drawerId: string;
}

const activeTimers = new Map<string, ActiveTimer>();
const activeChoiceTimers = new Map<string, ChoiceTimer>();

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
 * Stops and clears any running turn timer for a room
 */
export function stopTurnTimer(roomId: string): void {
  const timer = activeTimers.get(roomId);
  if (timer) {
    clearInterval(timer.intervalId);
    activeTimers.delete(roomId);
  }
}

/**
 * Stops and clears any running word choice timer for a room
 */
export function stopWordChoiceTimer(roomId: string): void {
  const timer = activeChoiceTimers.get(roomId);
  if (timer) {
    clearTimeout(timer.timeoutId);
    activeChoiceTimers.delete(roomId);
    console.log(`⏱️ Stopped word choice timer for room ${roomId}`);
  }
}

/**
 * Executes server-authoritative word choice (used by both manual selection and auto-pick timeout)
 */
export async function executeWordSelection(
  io: AppServer,
  roomId: string,
  drawerId: string,
  word: string,
  isAutoPick: boolean = false
): Promise<boolean> {
  stopWordChoiceTimer(roomId);

  const cleanRoomId = roomId.trim().toUpperCase();
  const result = await selectWordInRoom(cleanRoomId, drawerId, word);
  if (!result.success || !result.maskedWord || !result.word) {
    console.warn(`⚠️ Word selection failed: ${result.error}`);
    return false;
  }

  const room = await getRoom(cleanRoomId);
  const duration = Number(room?.drawTime) || 60;
  const roundEndsAt = Date.now() + duration * 1000;

  await redis.hset(`room:${cleanRoomId}`, "roundEndsAt", roundEndsAt.toString());
  await redis.del(`room:${cleanRoomId}:turnDeltas`);

  const roomSockets = await io.in(cleanRoomId).fetchSockets();
  const drawerSocket = roomSockets.find((s) => s.data.playerId === drawerId);

  // Broadcast masked word to all players in the room
  io.to(cleanRoomId).emit("wordChosen", {
    maskedWord: result.maskedWord,
    drawerId,
    roundEndsAt,
    duration,
  });

  // Privately send the unmasked secret word to the drawer
  if (drawerSocket) {
    drawerSocket.emit("wordChosen", {
      word: result.word,
      maskedWord: result.maskedWord,
      drawerId,
      roundEndsAt,
      duration,
    });
  }

  const players = await getRoomPlayers(cleanRoomId);
  const drawer = players.find((p) => p.id === drawerId);
  if (drawer) {
    const text = isAutoPick
      ? `${drawer.name} took too long to pick! A word was auto-selected.`
      : `${drawer.name} is drawing now!`;
    io.to(cleanRoomId).emit("chatMessage", {
      senderId: "system",
      senderName: "System",
      text,
      type: "info",
    });
  }

  await startTurnTimer(io, cleanRoomId, duration);

  console.log(
    `📢 Word choice completed in room ${cleanRoomId} (${isAutoPick ? "AUTO" : "MANUAL"}: "${result.word}", duration: ${duration}s)`
  );
  return true;
}

/**
 * Starts a 15-second server-authoritative timer for the drawer to pick a word
 */
export function startWordChoiceTimer(
  io: AppServer,
  roomId: string,
  drawerId: string,
  durationSeconds: number = 15
): void {
  stopWordChoiceTimer(roomId);
  const endsAt = Date.now() + durationSeconds * 1000;

  const timeoutId = setTimeout(async () => {
    activeChoiceTimers.delete(roomId);

    const room = await getRoom(roomId);
    if (!room || room.status !== "choosing") return;

    // Check if drawer is still connected
    const players = await getRoomPlayers(roomId);
    const drawer = players.find((p) => p.id === drawerId);

    if (!drawer || !drawer.connected) {
      console.log(
        `⏱️ Word choice timer expired, but drawer ${drawerId} is disconnected/absent. Advancing turn.`
      );
      await transitionToNextTurn(io, roomId);
      return;
    }

    const wordOptions = await getWordOptionsForRoom(roomId, room.wordCount || 3);
    const pickedWord =
      wordOptions[Math.floor(Math.random() * wordOptions.length)] || "star";

    console.log(
      `⏱️ Word choice deadline passed in room ${roomId}. Auto-selecting "${pickedWord}" for ${drawer.name}`
    );
    await executeWordSelection(io, roomId, drawerId, pickedWord, true);
  }, durationSeconds * 1000);

  activeChoiceTimers.set(roomId, { timeoutId, endsAt, drawerId });
  console.log(
    `⏱️ Word choice timer started for drawer ${drawerId} in room ${roomId}: ${durationSeconds}s`
  );
}

/**
 * Resets a game to waiting lobby when connected players drop below 2
 */
export async function pauseRoomDueToInsufficientPlayers(
  io: AppServer,
  roomId: string,
  reason: string = "Not enough players to continue"
): Promise<void> {
  const roomKey = `room:${roomId}`;
  const room = await getRoom(roomId);
  if (!room || room.status === "waiting") return;

  console.log(`⏸️ Room ${roomId} paused: ${reason}`);

  stopTurnTimer(roomId);
  stopWordChoiceTimer(roomId);

  await redis.hset(roomKey, {
    status: "waiting",
    currentDrawerId: "",
    currentWord: "",
  });

  await clearRoomStrokes(roomId);
  io.to(roomId).emit("drawData", { type: "clear", x: 0, y: 0 });

  io.to(roomId).emit("roomPaused", { reason });
  io.to(roomId).emit("chatMessage", {
    senderId: "system",
    senderName: "System",
    text: `Game paused: ${reason}. Waiting for players to join...`,
    type: "system",
  });

  const players = await getRoomPlayers(roomId);
  io.to(roomId).emit("joinedRoom", {
    roomId,
    players,
    status: "waiting",
    hostId: room.hostId,
  });
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
    const teamScores = await getTeamScores(roomId);

    // Group players by team sorted descending by individual score
    const playersByTeam: Record<string, Player[]> = {};
    finalPlayers.forEach((p) => {
      const key = p.teamId || "unassigned";
      if (!playersByTeam[key]) playersByTeam[key] = [];
      playersByTeam[key].push(p);
    });
    for (const team of Object.keys(playersByTeam)) {
      playersByTeam[team].sort((a, b) => b.score - a.score);
    }

    io.to(roomId).emit("gameEnded", { finalScores, teamScores, playersByTeam });
    console.log(`🏆 Game ended in room ${roomId}! Final scores:`, finalScores, "Team scores:", teamScores);
    return;
  }

  const players = await getRoomPlayers(roomId);
  const nextDrawer = players.find((p) => p.id === nextTurn.currentDrawerId);

  if (nextDrawer && nextDrawer.connected) {
    io.to(roomId).emit("choosingWord", {
      drawerId: nextDrawer.id,
      drawerName: nextDrawer.name,
    });

    const room = await getRoom(roomId);
    const wordOptions = await getWordOptionsForRoom(roomId, room?.wordCount || 3);
    const roomSockets = await io.in(roomId).fetchSockets();
    const drawerSocket = roomSockets.find((s) => s.data.playerId === nextTurn.currentDrawerId);
    drawerSocket?.emit("chooseWord", { options: wordOptions });

    // Start 15-second server-authoritative word choice timer
    startWordChoiceTimer(io, roomId, nextDrawer.id, 15);

    console.log(
      `🎨 Next turn in ${roomId}: ${nextDrawer.name} (Round ${nextTurn.currentRound}/${nextTurn.totalRounds})`
    );
  } else {
    console.warn(
      `⚠️ Next drawer ${nextTurn.currentDrawerId} unavailable in room ${roomId}. Advancing turn.`
    );
    const connected = players.filter((p) => p.connected);
    if (connected.length < 2) {
      await pauseRoomDueToInsufficientPlayers(io, roomId);
    } else {
      await transitionToNextTurn(io, roomId);
    }
  }
}

/**
 * Handles turn wrap-up, canvas clear, and schedules 5s intermission
 */
export async function handleTurnEnd(
  io: AppServer,
  roomId: string,
  reasonOverride?: string
): Promise<void> {
  const timer = activeTimers.get(roomId);
  const startScores = timer?.startScores || {};
  stopTurnTimer(roomId);
  stopWordChoiceTimer(roomId);

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
  let reason = reasonOverride;
  if (!reason) {
    if (nonDrawers.length > 0 && guessedCount === nonDrawers.length) {
      reason = "Everyone guessed the word!";
    } else if (guessedCount === 0) {
      reason = "Nobody guessed the word!";
    } else {
      reason = "Time's up!";
    }
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

