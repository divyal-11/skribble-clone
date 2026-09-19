import { Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../types/events.js";
import { selectWordInRoom } from "../../services/wordService.js";

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export function handleWordSelect(socket: AppSocket) {
  const playerId = socket.data.playerId;

  socket.on("wordSelect", async ({ roomId, word }) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(`🎨 Word selected in room ${cleanRoomId}: "${word}" by ${playerId}`);

    const result = await selectWordInRoom(cleanRoomId, playerId, word);
    if (!result.success || !result.maskedWord || !result.word) {
      console.warn(`⚠️ Word selection failed: ${result.error}`);
      return;
    }

    // Send full word to drawer
    socket.emit("wordChosen", {
      word: result.word,
      maskedWord: result.maskedWord,
      drawerId: playerId,
    });

    // Broadcast masked word only to guessers
    socket.to(cleanRoomId).emit("wordChosen", {
      maskedWord: result.maskedWord,
      drawerId: playerId,
    });

    console.log(
      `📢 Broadcasted wordChosen (hint: "${result.maskedWord}") to room ${cleanRoomId}`
    );
  });
}
