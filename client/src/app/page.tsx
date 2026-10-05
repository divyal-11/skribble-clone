"use client";

import { SkribblLogo } from "@/components/common/SkribblLogo";
import { useState, useEffect } from "react";
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
import { TeamId } from "@/types/events";

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [inviteRoomCode, setInviteRoomCode] = useState<string | null>(null);
  const [inviteTeam, setInviteTeam] = useState<TeamId | null>(null);
  const [viewPodium, setViewPodium] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get("room");
      const teamParam = params.get("team");
      const vpParam = params.get("viewPodium");
      if (vpParam) setViewPodium(vpParam);

      if (teamParam && ["red", "blue", "green", "yellow"].includes(teamParam.toLowerCase())) {
        setInviteTeam(teamParam.toLowerCase() as TeamId);
      }

      if (roomParam) {
        setInviteRoomCode(roomParam.toUpperCase());
        setRoomInput(roomParam.toUpperCase());
      } else {
        // Also support skribbl direct format: ?XYZ123
        const rawParam = window.location.search.replace(/^\?/, "").trim();
        if (rawParam && /^[A-Za-z0-9]{4,8}$/.test(rawParam) && !rawParam.includes("=")) {
          setInviteRoomCode(rawParam.toUpperCase());
          setRoomInput(rawParam.toUpperCase());
        }
      }
    }
  }, []);

  const {
    isConnected,
    currentRoom,
    players,
    hostId,
    roomSettings,
    updateRoomSettings,
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
    playersByTeam,
    turnScores,
    turnEndReason,
  } = useGameSocket();

  const handleCreateRoom = () => {
    if (!playerName.trim()) return alert("Please enter your Name first");
    createRoom(playerName.trim(), selectedLanguage);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return alert("Please enter your Name first");
    const targetRoom = (inviteRoomCode || roomInput).trim().toUpperCase();
    if (!targetRoom) return alert("Please enter room code");
    joinRoom(targetRoom, playerName.trim(), inviteTeam, selectedLanguage);
  };

  const handleClearInvite = () => {
    setInviteRoomCode(null);
    setInviteTeam(null);
    setRoomInput("");
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  const myPlayerId = typeof window !== "undefined" ? getPlayerId() : "";
  const isDrawer = currentDrawerId === myPlayerId;
  const isGameOver = roomStatus === "gameEnd" || roomStatus === "finished";
  const isGameActive = roomStatus !== "waiting" && !isGameOver;

  return (
<main className="min-h-screen flex flex-col items-center justify-center p-6 text-white font-sans">
      <div className="mb-2">
        <SkribblLogo size="large" />
      </div>

      {notification && <Toast notification={notification} />}

      {viewPodium ? (
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          <div className="lg:col-span-3 order-2 lg:order-1 w-full">
            <InGameScoreboard
              players={viewPodium === "team" ? [
                { id: "1", name: "CaptainDoodl", score: 1450, hasGuessed: true, connected: true, teamId: "blue" },
                { id: "2", name: "PixelArt", score: 1100, hasGuessed: true, connected: true, teamId: "blue" },
                { id: "3", name: "BrushMaster", score: 1250, hasGuessed: true, connected: true, teamId: "red" },
                { id: "4", name: "Challenger", score: 750, hasGuessed: false, connected: true, teamId: "red" },
              ] : [
                { id: "1", name: "CaptainDoodl", score: 1850, hasGuessed: true, connected: true },
                { id: "2", name: "PixelArt", score: 1420, hasGuessed: true, connected: true },
                { id: "3", name: "BrushMaster", score: 980, hasGuessed: true, connected: true },
                { id: "4", name: "Challenger", score: 540, hasGuessed: false, connected: true },
              ]}
              myPlayerId="1"
              hostId="1"
              currentDrawerId={null}
              teamScores={viewPodium === "team" ? { blue: 2550, red: 2000 } : {}}
            />
          </div>
          <div className="lg:col-span-6 xl:col-span-6 order-1 lg:order-2 w-full">
            <GamePodium
              players={viewPodium === "team" ? [
                { id: "1", name: "CaptainDoodl", score: 1450, hasGuessed: true, connected: true, teamId: "blue" },
                { id: "2", name: "PixelArt", score: 1100, hasGuessed: true, connected: true, teamId: "blue" },
                { id: "3", name: "BrushMaster", score: 1250, hasGuessed: true, connected: true, teamId: "red" },
                { id: "4", name: "Challenger", score: 750, hasGuessed: false, connected: true, teamId: "red" },
              ] : [
                { id: "1", name: "CaptainDoodl", score: 1850, hasGuessed: true, connected: true },
                { id: "2", name: "PixelArt", score: 1420, hasGuessed: true, connected: true },
                { id: "3", name: "BrushMaster", score: 980, hasGuessed: true, connected: true },
                { id: "4", name: "Challenger", score: 540, hasGuessed: false, connected: true },
              ]}
              finalScores={viewPodium === "team" ? { "1": 1450, "2": 1100, "3": 1250, "4": 750 } : { "1": 1850, "2": 1420, "3": 980, "4": 540 }}
              teamScores={viewPodium === "team" ? { blue: 2550, red: 2000 } : {}}
              playersByTeam={viewPodium === "team" ? {
                blue: [
                  { id: "1", name: "CaptainDoodl", score: 1450, hasGuessed: true, connected: true, teamId: "blue" },
                  { id: "2", name: "PixelArt", score: 1100, hasGuessed: true, connected: true, teamId: "blue" },
                ],
                red: [
                  { id: "3", name: "BrushMaster", score: 1250, hasGuessed: true, connected: true, teamId: "red" },
                  { id: "4", name: "Challenger", score: 750, hasGuessed: false, connected: true, teamId: "red" },
                ],
              } : {}}
              isHost={true}
              onPlayAgain={() => {}}
              onLeaveRoom={() => {}}
            />
          </div>
          <div className="lg:col-span-3 xl:col-span-3 order-3 w-full h-full min-h-[450px]">
            <ChatBox
              messages={[
                { senderId: "sys", senderName: "System", text: "Match finished! Excellent drawings!", type: "info" },
                { senderId: "1", senderName: "CaptainDoodl", text: "GG everyone!", type: "chat" },
                { senderId: "2", senderName: "PixelArt", text: "That was so close haha", type: "chat" },
              ]}
              onSendMessage={() => {}}
              isDrawer={false}
              hasGuessed={false}
            />
          </div>
        </div>
      ) : !currentRoom ? (
        <JoinRoomCard
          playerName={playerName}
          setPlayerName={setPlayerName}
          roomInput={roomInput}
          setRoomInput={setRoomInput}
          language={selectedLanguage}
          setLanguage={setSelectedLanguage}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          isConnected={isConnected}
          inviteRoomCode={inviteRoomCode}
          inviteTeam={inviteTeam}
          onClearInvite={handleClearInvite}
        />
      ) : isGameOver ? (
        /* 🏆 1. Game Over Podium Screen (Seamless inside 3-column in-game view) */
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* 1. Final In-Game Scoreboard (Left) */}
          <div className="lg:col-span-3 order-2 lg:order-1 w-full">
            <InGameScoreboard
              players={players}
              myPlayerId={myPlayerId}
              hostId={hostId}
              currentDrawerId={null}
              teamScores={teamScores}
            />
          </div>

          {/* 2. Podium (Center) */}
          <div className="lg:col-span-6 xl:col-span-6 order-1 lg:order-2 w-full">
            <GamePodium
              players={players}
              finalScores={finalScores}
              teamScores={teamScores}
              playersByTeam={playersByTeam}
              isHost={myPlayerId === hostId}
              onPlayAgain={startGame}
              onLeaveRoom={leaveRoom}
            />
          </div>

          {/* 3. Live Chat (Right) */}
          <div className="lg:col-span-3 xl:col-span-3 order-3 w-full h-full min-h-[450px]">
            <ChatBox
              messages={messages}
              onSendMessage={sendGuess}
              isDrawer={false}
              hasGuessed={false}
            />
          </div>
        </div>
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
              isRoundEnd={roomStatus === "roundEnd"}
              turnScores={turnScores}
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
              turnScores={turnScores}
              turnEndReason={turnEndReason}
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
          roomSettings={roomSettings}
          onUpdateSettings={updateRoomSettings}
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
