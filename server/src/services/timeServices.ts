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
import { getRandomWords } from "../lib/words.js";

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
}

const activeTimers = new Map<string, ActiveTimer>();

//returns remaining secs on the clock for a room
export function getRemainingTime(roomId: string): number {
  const timer = activeTimers.get(roomId);
  if (!timer) return 0;
  return Math.max(0, Math.round((timer.endsAt - Date.now()) / 1000));
}

//stops and clears any runnig timer for a room
export function stopTurnTimer(roomId: string): void {
  const timer = activeTimers.get(roomId);
  if (timer) {
    clearInterval(timer.intervalId);
    activeTimers.delete(roomId);
  }
}

//starts the round countdown timer(ticks every sec)
export function startTurnTimer(
  io: AppServer,
  roomId: string,
  durationSeconds: number = 60,
): void {
  stopTurnTimer(roomId); //clear existing timer

  const endsAt = Date.now() + durationSeconds * 1000;

  const intervalId = setInterval(async () => {
    const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));

    if (remaining <= 0) {
      stopTurnTimer(roomId);
      await handleTurnEnd(io, roomId);
    }
  }, 1000);

  activeTimers.set(roomId, {
    intervalId,
    endsAt,
    duration: durationSeconds,
  });

  console.log(`⏱️ Turn timer started for room ${roomId}: ${durationSeconds}s`);
}

export async function triggerTurnEndEarly(
  io: AppServer,
  roomId: string,
): Promise<void> {
  console.log(
    `⚡ All players guessed in ${roomId}! Triggering early turn end.`,
  );
  stopTurnTimer(roomId);
  await handleTurnEnd(io, roomId);
}

//handles turn wrap-up 5s intermission and next turn / game over transition
export async function handleTurnEnd(
  io: AppServer,
  roomId: string,
): Promise<void> {
  stopTurnTimer(roomId);

  const room = await getRoom(roomId);
  const players = await getRoomPlayers(roomId);

  //build current scores map
  const scores: Record<string, number> = {};
  players.forEach((p) => {
    scores[p.id] = p.score;
  });

  //broadcast turnend with revealed word and scores
  const revealedWord = room?.currentWord ?? "";
  io.to(roomId).emit("turnEnded", {
    word: revealedWord,
    scores,
  });
  console.log(`turn ended in ${roomId} word was:${revealedWord}`);

  //clear canvas in redis and tell clients to clear
  await clearRoomStrokes(roomId);
  io.to(roomId).emit("drawData", { type: "clear", x: 0, y: 0 });

  //5 sec scorecard intermission before next turn and round
  setTimeout(async () => {
    // Reset guess status for all players in Redis
    await resetPlayerGuessed(roomId);
    // Advance turn or round in Redis
    const nextTurn = await advanceTurnInRoom(roomId);

    if (nextTurn.gameOver) {
      // Game finished: emit final rankings
      const finalPlayers = await getRoomPlayers(roomId);
      const finalScores: Record<string, number> = {};
      finalPlayers.forEach((p) => {
        finalScores[p.id] = p.score;
      });

      io.to(roomId).emit("gameEnded", { finalScores });
      console.log(`🏆 Game ended in room ${roomId}!`);
      return;
    }

    // Next turn: notify room who is drawing
    const updatedPlayers = await getRoomPlayers(roomId);
    const nextDrawer = updatedPlayers.find(
      (p) => p.id === nextTurn.currentDrawerId,
    );

    if (nextDrawer) {
      io.to(roomId).emit("choosingWord", {
        drawerId: nextDrawer.id,
        drawerName: nextDrawer.name,
      });

      // Send 3 fresh word options privately to the new drawer
      const wordOptions = getRandomWords(3);
      const roomSockets = await io.in(roomId).fetchSockets();
      const drawerSocket = roomSockets.find(
        (s) => s.data.playerId === nextTurn.currentDrawerId,
      );

      if (drawerSocket) {
        drawerSocket.emit("chooseWord", { options: wordOptions });
      }
      console.log(
        `🎨 Next turn in ${roomId}: ${nextDrawer.name} (Round ${nextTurn.currentRound}/${nextTurn.totalRounds})`,
      );
    }
  }, 5000);
}
