import { Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  Player,
  TeamId,
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

const VALID_TEAMS: TeamId[] = ["red", "blue", "green", "yellow"];

export function handleJoinRoom(socket: AppSocket) {
  const playerId = socket.data.playerId;

  socket.on("joinRoom", async ({ roomId, playerName, teamId, language }) => {
    const cleanRoomId = roomId.trim().toUpperCase();
    const cleanPlayerName = playerName.trim() || "Anonymous";

    // 1. Cancel any disconnect grace period if reconnecting
    cancelDisconnectGracePeriod(playerId);

    const cleanTeamId = teamId && VALID_TEAMS.includes(teamId.toLowerCase() as TeamId)
      ? (teamId.toLowerCase() as TeamId)
      : undefined;

    const player: Player = {
      id: playerId,
      name: cleanPlayerName,
      score: 0,
      hasGuessed: false,
      connected: true,
      teamId: cleanTeamId,
    };

    const { room, players, isReconnect } = await addPlayerToRoom(cleanRoomId, player, language);

    socket.join(cleanRoomId);
    socket.data.roomId = cleanRoomId;

    console.log(`👤 ${player.name} (${player.id}) joined room ${cleanRoomId}`);

    const masked = room.currentWord ? maskWord(room.currentWord) : undefined;
    const isDrawer = room.currentDrawerId === playerId;
    const roundEndsAt = getRoundEndsAt(cleanRoomId);

    // 2. Send complete room snapshot with settings
    socket.emit("joinedRoom", {
      roomId: cleanRoomId,
      players,
      status: room.status,
      hostId: room.hostId,
      settings: {
        maxPlayers: room.maxPlayers || 8,
        drawTime: room.drawTime || 80,
        rounds: room.totalRounds || 3,
        hints: room.hints || 2,
        wordCount: room.wordCount || 3,
        language: room.language || "English",
        gameMode: room.gameMode || "Normal",
        teamCount: room.teamCount || 2,
        customWords: "",
        customWordsOnly: room.customWordsOnly || false,
      },
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
