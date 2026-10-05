import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../types/events.js";
import { startGameInRoom } from "../../services/turnService.js";
import { getRoomPlayers } from "../../services/playerService.js";
import { getWordOptionsForRoom } from "../../services/wordService.js";

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

  socket.on("startGame", async ({ roomId }) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(`🎮 Start Game requested for room ${cleanRoomId} by ${playerId}`);

    const result = await startGameInRoom(cleanRoomId, playerId);
    if (!result.success || !result.turnOrder || !result.currentDrawerId) {
      console.warn(`⚠️ Cannot start game in room ${cleanRoomId}: ${result.error}`);
      return;
    }

    const players = await getRoomPlayers(cleanRoomId);
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
