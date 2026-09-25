"use client";

import { useState } from "react";
import { getPlayerId } from "@/lib/socket";
import { useGameSocket } from "@/hooks/useGameSocket";
import {
  Toast,
  JoinRoomCard,
  RoomLobby,
  WordSelectModal,
  ConnectionBadge,
  Canvas,
} from "@/components";

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [roomInput, setRoomInput] = useState("");

  const {
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
  } = useGameSocket();

  const handleCreateRoom = () => {
    if (!playerName.trim()) return alert("Please enter your Name first");
    createRoom(playerName.trim());
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return alert("Please enter your Name first");
    if (!roomInput.trim()) return alert("Please enter room code");
    joinRoom(roomInput.trim().toUpperCase(), playerName.trim());
  };

  const myPlayerId = typeof window !== "undefined" ? getPlayerId() : "";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 text-white font-sans">
      {notification && <Toast notification={notification} />}

      <ConnectionBadge isConnected={isConnected} />

      {!currentRoom ? (
        <JoinRoomCard
          playerName={playerName}
          setPlayerName={setPlayerName}
          roomInput={roomInput}
          setRoomInput={setRoomInput}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          isConnected={isConnected}
        />
      ) : roomStatus === "drawing" ? (
        <Canvas
          roomId={currentRoom}
          isDrawer={currentDrawerId === myPlayerId}
          drawerName={players.find((p) => p.id === currentDrawerId)?.name}
          word={currentWord}
          maskedWord={maskedWord}
        />
      ) : (
        <RoomLobby
          roomId={currentRoom}
          players={players}
          myPlayerId={myPlayerId}
          hostId={hostId}
          onLeaveRoom={leaveRoom}
          onStartGame={startGame}
        />
      )}

      {wordOptions.length > 0 && (
        <WordSelectModal
          words={wordOptions}
          onSelectWord={selectWord}
        />
      )}
    </main>
  );
}
