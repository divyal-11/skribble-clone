"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { Player } from "@/types/events";
import { NotificationData } from "@/components/modals/Toast";

export function useGameSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [roomStatus, setRoomStatus] = useState<string>("waiting");
  const [currentDrawerId, setCurrentDrawerId] = useState<string | null>(null);
  const [currentWord, setCurrentWord] = useState<string | undefined>(undefined);
  const [maskedWord, setMaskedWord] = useState<string | undefined>(undefined);


  const showNotification = (message: string, type: "join" | "leave") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    socket.connect();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onJoinedRoom = (data: {
      roomId: string;
      players: Player[];
      status: string;
      hostId: string;
    }) => {
      setCurrentRoom(data.roomId);
      setPlayers(data.players);
      setHostId(data.hostId);
      setRoomStatus(data.status);
    };

    const onPlayerJoined = (data: { player: Player }) => {
      showNotification(`${data.player.name} joined the room`, "join");
      setPlayers((prev) => {
        if (prev.some((p) => p.id === data.player.id)) return prev;
        return [...prev, data.player];
      });
    };

    const onPlayerLeft = (data: { playerId: string; newHostId?: string }) => {
      if (data.newHostId) {
        setHostId(data.newHostId);
      }
      setPlayers((prev) => {
        const leftPlayer = prev.find((p) => p.id === data.playerId);
        if (leftPlayer) {
          showNotification(`${leftPlayer.name} left the room`, "leave");
        }
        return prev.filter((p) => p.id !== data.playerId);
      });
    };

    const onChooseWord = (data: { options: string[] }) => {
      setWordOptions(data.options);
    };

    const onWordChosen = (data: {
      drawerId: string;
      word?: string;
      maskedWord: string;
    }) => {
      setRoomStatus("drawing");
      setCurrentDrawerId(data.drawerId);
      setMaskedWord(data.maskedWord);
      if (data.word) setCurrentWord(data.word);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("joinedRoom", onJoinedRoom);
    socket.on("playerJoined", onPlayerJoined);
    socket.on("playerLeft", onPlayerLeft);
    socket.on("chooseWord", onChooseWord)
    socket.on("wordChosen", onWordChosen);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("joinedRoom", onJoinedRoom);
      socket.off("playerJoined", onPlayerJoined);
      socket.off("playerLeft", onPlayerLeft);
      socket.off("chooseWord", onChooseWord)
      socket.off("wordChosen", onWordChosen);
    };
  }, []);

  const createRoom = (playerName: string) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    socket.emit("joinRoom", { roomId: code, playerName });
  };

  const joinRoom = (roomId: string, playerName: string) => {
    socket.emit("joinRoom", { roomId, playerName });
  };

  const leaveRoom = () => {
    if (currentRoom) {
      socket.emit("leaveRoom", { roomId: currentRoom });
      setCurrentRoom(null);
      setPlayers([]);
      setHostId(null);
      setRoomStatus("waiting");
      setCurrentDrawerId(null);
      setCurrentWord(undefined);
      setMaskedWord(undefined);
    }
  };

  const startGame = () => {
    if (currentRoom) {
      socket.emit("startGame", { roomId: currentRoom });
    }
  };

  const selectWord = (word: string) => {
    if (currentRoom) {
      socket.emit("wordSelect", { roomId: currentRoom, word });
      setWordOptions([]);
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
    roomStatus,
    currentDrawerId,
    currentWord,
    maskedWord,
  };
}
