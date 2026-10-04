import { Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../types/events.js";
import { removePlayerFromRoom, setPlayerConnectionStatus } from "../../services/playerService.js";
import { getRoom } from "../../services/roomService.js";


type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

//in memory grace period timers: playerId-> Timeout
export const disconnectTimers = new Map<string,NodeJS.Timeout>();

export function cancelDisconnectGracePeriod(playerId: string): void{
  const timer = disconnectTimers.get(playerId);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(playerId);
    console.log(`⏱️ Cancelled disconnect grace period for player ${playerId}`);
  }
}


export function handleDisconnect(socket: AppSocket) {
  const playerId = socket.data.playerId;
  socket.on("disconnect", async (reason) => {
    const currentRoomId = socket.data.roomId;
    console.log(`❌ Disconnected: socket=${socket.id} (Reason: ${reason})`);
    if (!currentRoomId) return;
    const room = await getRoom(currentRoomId);
    // If still in lobby ("waiting"), remove immediately
    if (!room || room.status === "waiting") {
      const { newHostId } = await removePlayerFromRoom(currentRoomId, playerId);
      socket.to(currentRoomId).emit("playerLeft", { playerId, newHostId });
      return;
    }
    // Mid-game: mark offline and start 20s grace period
    await setPlayerConnectionStatus(currentRoomId, playerId, false);
    cancelDisconnectGracePeriod(playerId);
    const timer = setTimeout(async () => {
      disconnectTimers.delete(playerId);
      console.log(`⌛ Grace period expired for ${playerId} in ${currentRoomId}`);
      const { newHostId } = await removePlayerFromRoom(currentRoomId, playerId);
      socket.to(currentRoomId).emit("playerLeft", { playerId, newHostId });
    }, 20000);
    disconnectTimers.set(playerId, timer);
  });
}

