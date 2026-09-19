import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types/events.js";
import { startGameInRoom, selectWordInRoom } from "../services/turnService.js";
import { getRandomWords } from "../lib/words.js";

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

export function registerGameHandlers(io: AppServer, socket: AppSocket) {
  const playerId = socket.data.playerId;

  // 1. Handle Start Game (Host only)
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

    // Broadcast gameStarted to all players in the room
    io.to(cleanRoomId).emit("gameStarted", {
      turnOrder: result.turnOrder,
      totalRounds: result.totalRounds || 3,
    });

    // Pick 3 random words for the drawer
    const wordOptions = getRandomWords(3);

    // Find the drawer's socket and send the options PRIVATELY
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

  // 2. Handle Word Selection
  socket.on("wordSelect", async ({ roomId, word }) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(`🎨 Word selected in room ${cleanRoomId}: "${word}" by ${playerId}`);

    const result = await selectWordInRoom(cleanRoomId, playerId, word);
    if (!result.success || !result.maskedWord || !result.word) {
      console.warn(`⚠️ Word selection failed: ${result.error}`);
      return;
    }

    // Send to drawer (includes the actual word to draw)
    socket.emit("wordChosen", {
      word: result.word,
      maskedWord: result.maskedWord,
      drawerId: playerId,
    });

    // Broadcast to guessers (ONLY masked string, secret word stays hidden)
    socket.to(cleanRoomId).emit("wordChosen", {
      maskedWord: result.maskedWord,
      drawerId: playerId,
    });

    console.log(
      `📢 Broadcasted wordChosen (hint: "${result.maskedWord}") to room ${cleanRoomId}`
    );
  });
}
