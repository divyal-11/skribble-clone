import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../types/events.js";
import {
  getRoomPlayers,
  removePlayerFromRoom,
  setPlayerConnectionStatus,
} from "../../services/playerService.js";
import { getRoom } from "../../services/roomService.js";
import { cleanupSocketRateLimits } from "../../services/rateLimiterService.js";
import {
  handleTurnEnd,
  pauseRoomDueToInsufficientPlayers,
  stopWordChoiceTimer,
} from "../../services/timeServices.js";

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

// In-memory grace period timers: playerId -> Timeout
export const disconnectTimers = new Map<string, NodeJS.Timeout>();

export function cancelDisconnectGracePeriod(playerId: string): void {
  const timer = disconnectTimers.get(playerId);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(playerId);
    console.log(`⏱️ Cancelled disconnect grace period for player ${playerId}`);
  }
}

export function handleDisconnect(io: AppServer, socket: AppSocket) {
  const playerId = socket.data.playerId;

  socket.on("disconnect", async (reason) => {
    // Clean up rate limiting memory
    cleanupSocketRateLimits(socket.id);

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

    // Check if connected players dropped below 2 right now
    const players = await getRoomPlayers(currentRoomId);
    const connectedPlayers = players.filter((p) => p.connected);
    if (connectedPlayers.length < 2) {
      console.log(
        `⚠️ Room ${currentRoomId} dropped below 2 connected players on disconnect of ${playerId}.`
      );
      await pauseRoomDueToInsufficientPlayers(
        io,
        currentRoomId,
        "Not enough connected players"
      );
      return;
    }

    const timer = setTimeout(async () => {
      disconnectTimers.delete(playerId);
      console.log(`⌛ Grace period expired for ${playerId} in ${currentRoomId}`);

      const currentRoom = await getRoom(currentRoomId);
      const { newHostId } = await removePlayerFromRoom(currentRoomId, playerId);
      io.to(currentRoomId).emit("playerLeft", { playerId, newHostId });

      const currentPlayers = await getRoomPlayers(currentRoomId);
      const currentConnected = currentPlayers.filter((p) => p.connected);

      // Check if room dropped below 2 connected players
      if (currentConnected.length < 2) {
        await pauseRoomDueToInsufficientPlayers(
          io,
          currentRoomId,
          "Not enough connected players"
        );
        return;
      }

      // If the removed player was the active drawer, handle turn wrap-up immediately
      if (currentRoom && playerId === currentRoom.currentDrawerId) {
        if (currentRoom.status === "choosing") {
          console.log(
            `⏱️ Choosing drawer ${playerId} left permanently. Advancing turn.`
          );
          stopWordChoiceTimer(currentRoomId);
          await handleTurnEnd(io, currentRoomId, "Drawer disconnected!");
        } else if (currentRoom.status === "drawing") {
          console.log(
            `⏱️ Active drawer ${playerId} left permanently. Ending turn early.`
          );
          await handleTurnEnd(io, currentRoomId, "Drawer disconnected!");
        }
      }
    }, 20000);

    disconnectTimers.set(playerId, timer);
  });
}

