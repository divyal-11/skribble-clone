import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../types/events.js";
import { startGameInRoom } from "../../services/turnService.js";
import { getRoomPlayers } from "../../services/playerService.js";
import { getWordOptionsForRoom } from "../../services/wordService.js";
import { autoBalanceTeams, getTeamScores } from "../../services/teamService.js";
import { startWordChoiceTimer } from "../../services/timeServices.js";
import { getRoom } from "../../services/roomService.js";

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

export function handleStartGame(io: AppServer, socket: AppSocket) {
  const playerId = socket.data.playerId;

  socket.on("startGame", async ({ roomId, settings }) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(`🎮 Start Game requested for room ${cleanRoomId} by ${playerId}`);

    const result = await startGameInRoom(cleanRoomId, playerId, settings);
    if (!result.success || !result.turnOrder || !result.currentDrawerId) {
      console.warn(`⚠️ Cannot start game in room ${cleanRoomId}: ${result.error}`);
      return;
    }

    const players = await getRoomPlayers(cleanRoomId);

    // Immediately broadcast 0 scores so UI reflects clean state for new game / Play Again
    const resetScores: Record<string, number> = {};
    players.forEach((p) => {
      resetScores[p.id] = 0;
    });
    io.to(cleanRoomId).emit("scoreUpdate", { scores: resetScores });

    const room = await getRoom(cleanRoomId);
    const isTeamMode = (settings?.gameMode || room?.gameMode) === "Team";
    const teamCount = settings?.teamCount || room?.teamCount || 2;

    // If Team mode, ensure all players are assigned to active teams
    if (isTeamMode) {
      const balanced = await autoBalanceTeams(cleanRoomId, teamCount);
      balanced.forEach((p) => {
        if (p.teamId) {
          io.to(cleanRoomId).emit("teamUpdated", { playerId: p.id, teamId: p.teamId });
        }
      });
      const teamScores = await getTeamScores(cleanRoomId);
      io.to(cleanRoomId).emit("teamScoresUpdate", { scores: teamScores });
    }

    const drawer = players.find((p) => p.id === result.currentDrawerId);

    // Broadcast game start to room
    io.to(cleanRoomId).emit("gameStarted", {
      turnOrder: result.turnOrder,
      totalRounds: result.totalRounds || 3,
      currentDrawerId: result.currentDrawerId,
    });

    if (drawer) {
      io.to(cleanRoomId).emit("choosingWord", {
        drawerId: drawer.id,
        drawerName: drawer.name,
      });

      // Start 15-second server-authoritative word choice timer
      startWordChoiceTimer(io, cleanRoomId, drawer.id, 15);
    }

    // Dynamic word options from custom wordpack / count
    const wordOptions = await getWordOptionsForRoom(
      cleanRoomId,
      result.wordCount || 3
    );
    const roomSockets = await io.in(cleanRoomId).fetchSockets();
    const drawerSocket = roomSockets.find(
      (s) => s.data.playerId === result.currentDrawerId
    );

    if (drawerSocket) {
      drawerSocket.emit("chooseWord", { options: wordOptions });
    }
  });
}
