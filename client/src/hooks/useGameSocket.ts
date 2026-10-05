import { Player, ChatMessagePayload, RoomSettings, TeamId } from "@/types/events";
import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { NotificationData } from "@/components/modals/Toast";
import { soundManager } from "@/lib/sound";

export function useGameSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [notification, setNotification] = useState<NotificationData | null>(
    null,
  );
  const [roomStatus, setRoomStatus] = useState<string>("waiting");
  const [currentDrawerId, setCurrentDrawerId] = useState<string | null>(null);
  const [choosingDrawerName, setChoosingDrawerName] = useState<string | null>(
    null,
  );
  const [currentWord, setCurrentWord] = useState<string | undefined>(undefined);
  const [maskedWord, setMaskedWord] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [revealedWord, setRevealedWord] = useState<string | null>(null);
  const [finalScores, setFinalScores] = useState<Record<string, number> | null>(
    null,
  );
  const [teamScores, setTeamScores] = useState<Record<string, number>>({});
  const [playersByTeam, setPlayersByTeam] = useState<Record<string, Player[]>>({});
  const [turnScores, setTurnScores] = useState<Record<string, number>>({});
  const [turnEndReason, setTurnEndReason] = useState<string>("Everyone guessed the word!");

  const showNotification = (message: string, type: "join" | "leave") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Synchronized countdown timer with tick sound effect
  useEffect(() => {
    if (!roundEndsAt) {
      setTimeLeft(60);
      return;
    }
    let lastTick = -1;
    const updateTime = () => {
      const remaining = Math.max(
        0,
        Math.ceil((roundEndsAt - Date.now()) / 1000),
      );
      setTimeLeft(remaining);
      if (remaining <= 5 && remaining > 0 && remaining !== lastTick) {
        lastTick = remaining;
        soundManager.play("tick");
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 500);
    return () => clearInterval(interval);
  }, [roundEndsAt]);

  useEffect(() => {
    socket.connect();

    const onConnect = () => {
      setIsConnected(true);
      // Auto-rejoin room if refreshing an active game
      const savedRoom = sessionStorage.getItem("doodl_room");
      const savedName = sessionStorage.getItem("doodl_name");
      const savedTeam = sessionStorage.getItem("doodl_team");
      if (savedRoom && savedName) {
        console.log(`🔄 Auto-rejoining saved room: ${savedRoom} as ${savedName} (team: ${savedTeam || "none"})`);
        socket.emit("joinRoom", { roomId: savedRoom, playerName: savedName, teamId: savedTeam });
      }
    };
    const onDisconnect = () => setIsConnected(false);

    const onJoinedRoom = (data: {
      roomId: string;
      players: Player[];
      status: string;
      hostId: string;
      currentDrawerId?: string;
      maskedWord?: string;
      word?: string;
    }) => {
      setCurrentRoom(data.roomId);
      setPlayers(data.players);
      setHostId(data.hostId);
      setRoomStatus(data.status);
      if (data.currentDrawerId) setCurrentDrawerId(data.currentDrawerId);
      if (data.maskedWord) setMaskedWord(data.maskedWord);
      if (data.word) setCurrentWord(data.word);
    };

    const onPlayerJoined = (data: { player: Player }) => {
      showNotification(`${data.player.name} joined the room`, "join");
      soundManager.play("join");
      setPlayers((prev) => {
        if (prev.some((p) => p.id === data.player.id)) return prev;
        return [...prev, data.player];
      });
    };

    const onPlayerLeft = (data: { playerId: string; newHostId?: string }) => {
      if (data.newHostId) {
        setHostId(data.newHostId);
      }
      soundManager.play("leave");
      setPlayers((prev) => {
        const leftPlayer = prev.find((p) => p.id === data.playerId);
        if (leftPlayer) {
          showNotification(`${leftPlayer.name} left the room`, "leave");
        }
        return prev.filter((p) => p.id !== data.playerId);
      });
    };

    const onGameStarted = (data: {
      turnOrder: string[];
      totalRounds: number;
      currentDrawerId: string;
    }) => {
      setRoomStatus("choosing");
      setCurrentDrawerId(data.currentDrawerId);
    };

    const onChoosingWord = (data: { drawerId: string; drawerName: string }) => {
      setRoomStatus("choosing");
      setCurrentDrawerId(data.drawerId);
      setChoosingDrawerName(data.drawerName);
      setRoundEndsAt(null);
      setWordOptions([]);
      setCurrentWord(undefined);
      setRevealedWord(null);
    };

    const onChooseWord = (data: { options: string[] }) => {
      setWordOptions(data.options);
    };

    const onWordChosen = (data: {
      drawerId: string;
      word?: string;
      maskedWord: string;
      roundEndsAt: number;
      duration: number;
    }) => {
      setRoomStatus("drawing");
      setCurrentDrawerId(data.drawerId);
      setMaskedWord(data.maskedWord);
      setRoundEndsAt(data.roundEndsAt);
      setChoosingDrawerName(null);
      setWordOptions([]);
      setCurrentWord(data.word);
      setTurnScores({});
      soundManager.play("roundStart");
    };

    const onGuessResult = (data: {
      playerId: string;
      correct: boolean;
      word?: string;
    }) => {
      if (data.correct && data.word) {
        setCurrentWord(data.word);
      }
    };

    const onChatMessage = (msg: ChatMessagePayload) => {
      if (msg.type === "correct") {
        soundManager.play("playerGuessed");
      }
      setMessages((prev) => [...prev, msg]);
    };

    const onScoreUpdate = ({
      scores,
      guesserId,
      teamScores: updatedTeamScores,
    }: {
      scores: Record<string, number>;
      guesserId?: string;
      teamScores?: Record<string, number>;
    }) => {
      setPlayers((prev) =>
        prev.map((p) => ({
          ...p,
          score: scores[p.id] !== undefined ? scores[p.id] : p.score,
          hasGuessed: p.hasGuessed || p.id === guesserId,
        })),
      );
      if (updatedTeamScores) {
        setTeamScores(updatedTeamScores);
      }
    };

    const onTurnEnded = (data: {
      word: string;
      scores: Record<string, number>;
      scoreDeltas?: Record<string, number>;
      reason?: string;
    }) => {
      setRoomStatus("roundEnd");
      setRevealedWord(data.word);
      setRoundEndsAt(null);
      setTurnScores(data.scoreDeltas || {});
      setTurnEndReason(data.reason || "Time's up!");
      if (data.reason?.includes("Nobody")) {
        soundManager.play("roundEndFailure");
      } else {
        soundManager.play("roundEndSuccess");
      }
      setPlayers((prev) =>
        prev.map((p) => ({
          ...p,
          score: data.scores[p.id] !== undefined ? data.scores[p.id] : p.score,
          hasGuessed: false,
        })),
      );
    };

    const onGameEnded = (data: {
      finalScores: Record<string, number>;
      teamScores?: Record<string, number>;
      playersByTeam?: Record<string, Player[]>;
    }) => {
      setRoomStatus("gameEnd");
      setFinalScores(data.finalScores);
      if (data.teamScores) setTeamScores(data.teamScores);
      if (data.playersByTeam) setPlayersByTeam(data.playersByTeam);
      setRoundEndsAt(null);
      setPlayers((prev) =>
        prev.map((p) => ({
          ...p,
          score: data.finalScores[p.id] !== undefined ? data.finalScores[p.id] : p.score,
        }))
      );
      soundManager.play("roundEndSuccess");
    };

    const onHintRevealed = (data: { maskedWord: string }) => {
      setMaskedWord(data.maskedWord);
    };


    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("joinedRoom", onJoinedRoom);
    socket.on("playerJoined", onPlayerJoined);
    socket.on("playerLeft", onPlayerLeft);
    socket.on("gameStarted", onGameStarted);
    socket.on("choosingWord", onChoosingWord);
    socket.on("chooseWord", onChooseWord);
    socket.on("wordChosen", onWordChosen);
    socket.on("guessResult", onGuessResult);
    socket.on("hintRevealed", onHintRevealed);
    socket.on("chatMessage", onChatMessage);
    socket.on("scoreUpdate", onScoreUpdate);
    socket.on("turnEnded", onTurnEnded);
    const onTeamUpdated = (data: { playerId: string; teamId: TeamId }) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === data.playerId ? { ...p, teamId: data.teamId } : p))
      );
    };

    const onTeamScoresUpdate = (data: { scores: Record<string, number> }) => {
      setTeamScores(data.scores);
    };

    socket.on("teamUpdated", onTeamUpdated);
    socket.on("teamScoresUpdate", onTeamScoresUpdate);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("joinedRoom", onJoinedRoom);
      socket.off("playerJoined", onPlayerJoined);
      socket.off("playerLeft", onPlayerLeft);
      socket.off("gameStarted", onGameStarted);
      socket.off("choosingWord", onChoosingWord);
      socket.off("chooseWord", onChooseWord);
      socket.off("wordChosen", onWordChosen);
      socket.off("hintRevealed", onHintRevealed);
      socket.off("guessResult", onGuessResult);
      socket.off("chatMessage", onChatMessage);
      socket.off("scoreUpdate", onScoreUpdate);
      socket.off("turnEnded", onTurnEnded);
      socket.off("gameEnded", onGameEnded);
      socket.off("teamUpdated", onTeamUpdated);
      socket.off("teamScoresUpdate", onTeamScoresUpdate);
    };
  }, []);

  const createRoom = (playerName: string) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    sessionStorage.setItem("doodl_room", code);
    sessionStorage.setItem("doodl_name", playerName);
    socket.emit("joinRoom", { roomId: code, playerName });
  };

  const joinRoom = (roomId: string, playerName: string, teamId?: string | null) => {
    sessionStorage.setItem("doodl_room", roomId);
    sessionStorage.setItem("doodl_name", playerName);
    if (teamId) {
      sessionStorage.setItem("doodl_team", teamId);
    } else {
      sessionStorage.removeItem("doodl_team");
    }
    socket.emit("joinRoom", { roomId, playerName, teamId });
  };

  const leaveRoom = () => {
    // Clear storage so the user doesn't get auto-rejoined after leaving
    sessionStorage.removeItem("doodl_room");
    sessionStorage.removeItem("doodl_name");
    sessionStorage.removeItem("doodl_team");

    if (currentRoom) {
      socket.emit("leaveRoom", { roomId: currentRoom });
      setCurrentRoom(null);
      setPlayers([]);
      setHostId(null);
      setRoomStatus("waiting");
      setCurrentDrawerId(null);
      setChoosingDrawerName(null);
      setCurrentWord(undefined);
      setMaskedWord(undefined);
      setMessages([]);
      setRoundEndsAt(null);
      setTimeLeft(60);
      setPlayersByTeam({});
    }
  };

  const sendGuess = (text: string) => {
    if (currentRoom) {
      socket.emit("guess", { roomId: currentRoom, text });
    }
  };

  const startGame = (settings?: RoomSettings) => {
    if (currentRoom) {
      socket.emit("startGame", { roomId: currentRoom, settings });
    }
  };

  const selectWord = (word: string) => {
    if (currentRoom) {
      socket.emit("wordSelect", { roomId: currentRoom, word });
      setWordOptions([]);
    }
  };

  const switchTeam = (teamId: TeamId) => {
    if (currentRoom) {
      socket.emit("switchTeam", { roomId: currentRoom, teamId });
    }
  };

  return {
    isConnected,
    currentRoom,
    players,
    hostId,
    wordOptions,
    notification,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    selectWord,
    switchTeam,
    teamScores,
    playersByTeam,
    roomStatus,
    currentDrawerId,
    choosingDrawerName,
    currentWord,
    maskedWord,
    revealedWord,
    finalScores,
    messages,
    sendGuess,
    timeLeft,
    turnScores,
    turnEndReason,
  };
}
