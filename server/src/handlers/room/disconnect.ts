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

export function handleDisconnect(socket: AppSocket) {
  const playerId = socket.data.playerId;

  socket.on("disconnect", async (reason) => {
    const currentRoomId = socket.data.roomId;
    console.log(`❌ Disconnected: socket=${socket.id} (Reason: ${reason})`);
    if (currentRoomId) {
      const { newHostId } = await removePlayerFromRoom(currentRoomId, playerId);
      socket.to(currentRoomId).emit("playerLeft", { playerId, newHostId });
      if (newHostId) {
        console.log(`👑 New host for room ${currentRoomId}: ${newHostId}`);
      }
    }
  });
}
