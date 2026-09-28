import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../types/events.js";
import { getRoom } from "../../services/roomService.js";
import { getRoomPlayers, updatePlayerScore } from "../../services/playerService.js";
import { isCloseGuess, calculateGuessScore } from "../../services/chatService.js";

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

export function handleGuess(io:AppServer,socket:AppSocket){
  const playerId = socket.data.playerId;

  socket.on("guess",async({roomId,text})=>{
    const cleanRoomId = roomId.trim().toUpperCase();
    const cleanText = text.trim();
    if (!cleanText) return;

    const room = await getRoom(cleanRoomId);
    if (!room || room.status !== "drawing" || !room.currentWord) return;

    //drawer cannt guess their  own word
    if(room.currentDrawerId === playerId) return;

    const players = await getRoomPlayers(cleanRoomId);
    const currentPlayer = players.find((p)=> p.id === playerId);
    if(!currentPlayer || currentPlayer.hasGuessed) return;

    const isCorrect = cleanText.toLowerCase()=== room.currentWord.toLowerCase();

    if(isCorrect){
        //calc points and update redis
        const score = calculateGuessScore(45);
        const {updatedScores} = await updatePlayerScore(cleanRoomId, playerId, score);

        //announce to room without revealing the secret word
        io.to(cleanRoomId).emit("chatMessage",{
            senderId: playerId,
            senderName: currentPlayer.name,
            text: `${currentPlayer.name} guessed the word!`,
            type: "correct",

        })

        //broadcast updated scoreboard
        io.to(cleanRoomId).emit("scoreUpdate",{scores:updatedScores});
    }else {
        //check if close tupo and privately notify guesser
        if (isCloseGuess(cleanText, room.currentWord)) {
        socket.emit("chatMessage", {
          senderId: "system",
          senderName: "System",
          text: `"${cleanText}" is very close!`,
          type: "close",
        });
      }
      // Broadcast as regular chat to the room
      io.to(cleanRoomId).emit("chatMessage", {
        senderId: playerId,
        senderName: currentPlayer.name,
        text: cleanText,
        type: "chat",
      });
    }
  })
}