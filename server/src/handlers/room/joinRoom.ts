import { Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  Player,
} from "../../types/events.js";
import { addPlayerToRoom } from "../../services/playerService.js";

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export function handleJoinRoom(socket: AppSocket) {
  const playerId = socket.data.playerId;

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
}
