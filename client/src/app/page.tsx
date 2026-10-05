"use client";

import { SkribblLogo } from "@/components/common/SkribblLogo";
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
  ChatBox,
  GamePodium
} from "@/components";
import { InGameScoreboard } from "@/components/game/InGameScoreboard";

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
    choosingDrawerName,
    currentWord,
    maskedWord,
    messages,
    sendGuess,
    timeLeft,
    revealedWord,
    finalScores,
    switchTeam,
    teamScores,
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
  const isDrawer = currentDrawerId === myPlayerId;
  const isGameActive = roomStatus !== "waiting";

  return (
<main className="min-h-screen flex flex-col items-center justify-center p-6 text-white font-sans">
      <div className="mb-2">
        <SkribblLogo size="large" />
      </div>

      {notification && <Toast notification={notification} />}

      

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
      ) : roomStatus === "gameEnd" ? (
        /* 🏆 1. Game Over Podium Screen */
        <GamePodium
          players={players}
          finalScores={finalScores}
          teamScores={teamScores}
          isHost={myPlayerId === hostId}
          onPlayAgain={startGame}
          onLeaveRoom={leaveRoom}
        />
      ) : isGameActive ? (
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* 1. In-Game Live Scoreboard (Left column) */}
          <div className="lg:col-span-3 order-2 lg:order-1 w-full">
            <InGameScoreboard
              players={players}
              myPlayerId={myPlayerId}
              hostId={hostId}
              currentDrawerId={currentDrawerId}
              teamScores={teamScores}
            />
          </div>

          {/* 2. Drawing Canvas (Center column) */}
          <div className="lg:col-span-6 xl:col-span-6 order-1 lg:order-2 w-full">
            <Canvas
              roomId={currentRoom}
              isDrawer={isDrawer}
              drawerName={players.find((p) => p.id === currentDrawerId)?.name}
              word={currentWord}
              maskedWord={maskedWord}
              timeLeft={timeLeft}
              isChoosing={roomStatus === "choosing"}
              choosingDrawerName={
                choosingDrawerName ||
                players.find((p) => p.id === currentDrawerId)?.name
              }
              isRoundEnd={roomStatus === "roundEnd"}
              revealedWord={revealedWord || undefined}
              players={players}
            />
          </div>

          {/* 3. Live Chat & Guesses (Right column) */}
          <div className="lg:col-span-3 xl:col-span-3 order-3 w-full h-full min-h-[450px]">
            <ChatBox
              messages={messages}
              onSendMessage={sendGuess}
              isDrawer={isDrawer}
              hasGuessed={
                players.find((p) => p.id === myPlayerId)?.hasGuessed || false
              }
            />
          </div>
        </div>
      ) : (
        <RoomLobby
          roomId={currentRoom}
          players={players}
          myPlayerId={myPlayerId}
          hostId={hostId}
          messages={messages}
          onSendMessage={sendGuess}
          onStartGame={startGame}
          onSwitchTeam={switchTeam}
        />
      )}

      {wordOptions.length > 0 && isDrawer && (
        <WordSelectModal
          words={wordOptions}
          onSelectWord={selectWord}
        />
      )}
    </main>
  );
}
