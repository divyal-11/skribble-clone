import { Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  Player,
} from "../../types/events.js";
import { addPlayerToRoom } from "../../services/playerService.js";
import { getRoomStrokes } from "../../services/strokeService.js";
import { maskWord } from "../../lib/words.js";
import { cancelDisconnectGracePeriod } from "./disconnect.js";
import { getRoundEndsAt } from "../../services/timeServices.js";

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

    // 1. Cancel any disconnect grace period if reconnecting
    cancelDisconnectGracePeriod(playerId);

    const player: Player = {
      id: playerId,
      name: cleanPlayerName,
      score: 0,
      hasGuessed: false,
      connected: true,
    };

    const { room, players,isReconnect } = await addPlayerToRoom(cleanRoomId, player);

    socket.join(cleanRoomId);
    socket.data.roomId = cleanRoomId;

    console.log(`👤 ${player.name} (${player.id}) joined room ${cleanRoomId}`);

    const masked = room.currentWord ? maskWord(room.currentWord) : undefined;
    const isDrawer = room.currentDrawerId === playerId;
    const roundEndsAt = getRoundEndsAt(cleanRoomId);

    // 2. Send complete room snapshot
    socket.emit("joinedRoom", {
      roomId: cleanRoomId,
      players,
      status: room.status,
      hostId: room.hostId,
      currentDrawerId: room.currentDrawerId,
      maskedWord: masked,
      word: isDrawer ? room.currentWord : undefined,
    });

    // 3. If mid-turn, restore the round countdown timer and word
    if (room.status === "drawing" && roundEndsAt) {
      socket.emit("wordChosen", {
        maskedWord: masked || "",
        drawerId: room.currentDrawerId || "",
        word: isDrawer ? room.currentWord : undefined,
        roundEndsAt,
        duration: Math.max(1, Math.round((roundEndsAt - Date.now()) / 1000)),
      });
    }




    //replay existing strokes to the joining/reconnectnig player
    const strokes = await getRoomStrokes(cleanRoomId);
    if(strokes.length>0){
      socket.emit("canvasSync",{strokes})
    }

    // Only notify room if brand new player
    if (!isReconnect) {
      socket.to(cleanRoomId).emit("playerJoined", { player });
    }  });
}
