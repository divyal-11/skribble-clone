import { Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  Player,
} from "../../types/events.js";
import { addPlayerToRoom } from "../../services/playerService.js";
import { getRoom } from "../../services/roomService.js";
import { getRoomStrokes } from "../../services/strokeService.js";
import { maskWord } from "../../lib/words.js";


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

    const isDrawing = room.status === "drawing";
    const masked = room.currentWord ? maskWord(room.currentWord) : undefined;
    const isDrawer = room.currentDrawerId === playerId;
    socket.emit("joinedRoom", {
      roomId: cleanRoomId,
      players,
      status: room.status,
      hostId: room.hostId,
      currentDrawerId: room.currentDrawerId,
      maskedWord: masked,
      word: isDrawer ? room.currentWord : undefined, // only send full word to drawer
    });


    //replay existing strokes to the joining/reconnectnig player
    const strokes = await getRoomStrokes(cleanRoomId);
    if(strokes.length>0){
      socket.emit("canvasSync",{strokes})
    }

    socket.to(cleanRoomId).emit("playerJoined", { player });
  });
}
