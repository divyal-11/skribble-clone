import { Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../types/events.js";
import { removePlayerFromRoom } from "../../services/playerService.js";

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export function handleLeaveRoom(socket: AppSocket) {
  const playerId = socket.data.playerId;

  socket.on("leaveRoom", async ({ roomId }) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(`👋 ${playerId} explicitly left room ${cleanRoomId}`);

    const { newHostId } = await removePlayerFromRoom(cleanRoomId, playerId);
    socket.leave(cleanRoomId);
    socket.data.roomId = undefined;

    socket.to(cleanRoomId).emit("playerLeft", { playerId, newHostId });
  });
}
