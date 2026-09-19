import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  Player,
} from "../types/events.js";
import { addPlayerToRoom, removePlayerFromRoom } from "../services/roomService.js";

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

export function registerRoomHandlers(io: AppServer, socket: AppSocket) {
  const playerId = socket.data.playerId;

  // 1. Join Room
  socket.on("joinRoom", async ({ roomId, playerName }) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    const cleanPlayerName = playerName.trim() || "Anonymous";

    const player: Player = {
      id: playerId,
      name: cleanPlayerName,
      score: 0,
      hasGuessed: false,
      connected: true,
    };

    const { room, players } = await addPlayerToRoom(cleanRoomId, player);

    socket.join(cleanRoomId);
    socket.data.roomId = cleanRoomId;

    console.log(`👤 ${player.name} (${player.id}) joined room ${cleanRoomId}`);

    socket.emit("joinedRoom", {
      roomId: cleanRoomId,
      players,
      status: room.status,
      hostId: room.hostId,
    });

    socket.to(cleanRoomId).emit("playerJoined", { player });
  });

  // 2. Leave Room
  socket.on("leaveRoom", async ({ roomId }) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(`👋 ${playerId} explicitly left room ${cleanRoomId}`);

    const { newHostId } = await removePlayerFromRoom(cleanRoomId, playerId);
    socket.leave(cleanRoomId);
    socket.data.roomId = undefined;

    socket.to(cleanRoomId).emit("playerLeft", { playerId, newHostId });
  });

  // 3. Disconnect
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
