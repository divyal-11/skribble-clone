import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  TeamId,
} from "../../types/events.js";
import { setPlayerTeam } from "../../services/teamService.js";
import { getRoom } from "../../services/roomService.js";

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

export function handleSwitchTeam(io: AppServer, socket: AppSocket) {
  const playerId = socket.data.playerId;

  socket.on("switchTeam", async ({ roomId, teamId }) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    const room = await getRoom(cleanRoomId);

    // Only allow switching teams while in lobby
    if (!room || room.status !== "waiting") return;

    const updated = await setPlayerTeam(cleanRoomId, playerId, teamId);
    if (updated) {
      io.to(cleanRoomId).emit("teamUpdated", { playerId, teamId });
      console.log(`🚩 Player ${playerId} joined team ${teamId} in ${cleanRoomId}`);
    }
  });
}
