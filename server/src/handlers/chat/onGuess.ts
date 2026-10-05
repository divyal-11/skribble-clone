import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../types/events.js";
import { getRoom } from "../../services/roomService.js";
import { getRoomPlayers, updatePlayerScore } from "../../services/playerService.js";
import { isCloseGuess, calculateGuessScore } from "../../services/chatService.js";
import { getRemainingTime, triggerTurnEndEarly } from "../../services/timeServices.js";
import { checkRateLimit } from "../../services/rateLimiterService.js";
import { getTeamScores } from "../../services/teamService.js";
import { redis } from "../../lib/redis.js";

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
    // Drop flood events silently
    if (!checkRateLimit(socket.id, "guess")) {
      return;
    }
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
        const remainingSeconds = await getRemainingTime(cleanRoomId);
        const score = calculateGuessScore(remainingSeconds);
        const {players:updatedPlayers,updatedScores} = await updatePlayerScore(cleanRoomId, playerId, score);

        // Record point delta for this turn
        await redis.hincrby(`room:${cleanRoomId}:turnDeltas`, playerId, score);

        // Skribbl drawer bonus: drawer receives 25% of guesser's score
        if (room.currentDrawerId && room.currentDrawerId !== playerId) {
          const drawerBonus = Math.round(score * 0.25);
          if (drawerBonus > 0) {
            const { updatedScores: withDrawerScores } = await updatePlayerScore(cleanRoomId, room.currentDrawerId, drawerBonus);
            Object.assign(updatedScores, withDrawerScores);
            await redis.hincrby(`room:${cleanRoomId}:turnDeltas`, room.currentDrawerId, drawerBonus);
          }
        }

        //privately send the secret word to the correct guesser to fill their masked blanks
        socket.emit("guessResult", {
          playerId,
          correct: true,
          word: room.currentWord,
        });

        //announce to room with points earned
        io.to(cleanRoomId).emit("chatMessage",{
            senderId: playerId,
            senderName: currentPlayer.name,
            text: `${currentPlayer.name} guessed the word! (+${score} points)`,
            type: "correct",
        });
        
        const teamScores = await getTeamScores(cleanRoomId);

        //broadcast updated scoreboard
        io.to(cleanRoomId).emit("scoreUpdate", {
          scores: updatedScores,
          guesserId: playerId,
          teamScores,
        });

        if (Object.keys(teamScores).length > 0) {
          io.to(cleanRoomId).emit("teamScoresUpdate", { scores: teamScores });
        }

        // If all connected non-drawers have guessed, end the turn early
        const guessers = updatedPlayers.filter(
          (p) => p.id !== room.currentDrawerId && p.connected
        );
        const allGuessed =
          guessers.length > 0 && guessers.every((p) => p.hasGuessed);

        if (allGuessed) {
          await triggerTurnEndEarly(io, cleanRoomId);
        }
    }else {
        //check if close typo and privately notify guesser
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