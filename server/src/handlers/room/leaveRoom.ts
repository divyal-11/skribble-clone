import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../types/events.js";
import {
  getRoomPlayers,
  removePlayerFromRoom,
} from "../../services/playerService.js";
import { getRoom } from "../../services/roomService.js";
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

export function handleLeaveRoom(io: AppServer, socket: AppSocket) {
  const playerId = socket.data.playerId;

  socket.on("leaveRoom", async ({ roomId }) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    console.log(`👋 ${playerId} explicitly left room ${cleanRoomId}`);

    const roomBefore = await getRoom(cleanRoomId);
    const { newHostId } = await removePlayerFromRoom(cleanRoomId, playerId);
    socket.leave(cleanRoomId);
    socket.data.roomId = undefined;

    socket.to(cleanRoomId).emit("playerLeft", { playerId, newHostId });

    if (!roomBefore || roomBefore.status === "waiting") return;

    const remaining = await getRoomPlayers(cleanRoomId);
    const connected = remaining.filter((p) => p.connected);

    if (connected.length < 2) {
      await pauseRoomDueToInsufficientPlayers(
        io,
        cleanRoomId,
        "Not enough players to continue"
      );
      return;
    }

    if (playerId === roomBefore.currentDrawerId) {
      if (roomBefore.status === "choosing") {
        stopWordChoiceTimer(cleanRoomId);
        await handleTurnEnd(io, cleanRoomId, "Drawer left!");
      } else if (roomBefore.status === "drawing") {
        await handleTurnEnd(io, cleanRoomId, "Drawer left!");
      }
    }
  });
}

