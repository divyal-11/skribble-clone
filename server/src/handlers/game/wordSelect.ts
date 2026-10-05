import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../types/events.js";
import { executeWordSelection } from "../../services/timeServices.js";

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export function handleWordSelect(io: AppServer, socket: AppSocket) {
  const playerId = socket.data.playerId;

  socket.on("wordSelect", async ({ roomId, word }) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(`🎨 Word selected in room ${cleanRoomId}: "${word}" by ${playerId}`);
    await executeWordSelection(io, cleanRoomId, playerId, word, false);
  });
}

