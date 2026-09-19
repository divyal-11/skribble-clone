import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../types/events.js";
import { startGameInRoom } from "../../services/turnService.js";
import { getRandomWords } from "../../lib/words.js";

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

    console.log(
      `🚀 Game started in room ${cleanRoomId}! First drawer: ${result.currentDrawerId}`
    );

    // Broadcast to room
    io.to(cleanRoomId).emit("gameStarted", {
      turnOrder: result.turnOrder,
      totalRounds: result.totalRounds || 3,
    });

    // 3 random words
    const wordOptions = getRandomWords(3);

    // Privately emit to drawer only
    const roomSockets = await io.in(cleanRoomId).fetchSockets();
    const drawerSocket = roomSockets.find(
      (s) => s.data.playerId === result.currentDrawerId
    );

    if (drawerSocket) {
      drawerSocket.emit("chooseWord", { options: wordOptions });
      console.log(
        `📝 Sent 3 word options privately to drawer ${result.currentDrawerId}`
      );
    }
  });
}
