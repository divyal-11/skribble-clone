import { useState } from "react";
import { Player, RoomSettings, ChatMessagePayload } from "@/types/events";
import { PlayerList } from "./PlayerList";
import { LobbySettingsForm } from "./LobbySettingsForm";
import { LobbyHeader } from "./LobbyHeader";
import { ChatBox } from "../chat/ChatBox";

interface RoomLobbyProps {
  roomId: string;
  players: Player[];
  myPlayerId: string;
  hostId: string | null;
  messages: ChatMessagePayload[];
  onSendMessage: (msg: string) => void;
  onStartGame: (settings?: RoomSettings) => void;
}

export function RoomLobby({
  roomId,
  players,
  myPlayerId,
  hostId,
  messages,
  onSendMessage,
  onStartGame,
}: RoomLobbyProps) {
  const isHost = hostId === myPlayerId;
  const canStart = isHost && players.length >= 2;

  const [settings, setSettings] = useState<RoomSettings>({
    maxPlayers: 8,
    drawTime: 80,
    rounds: 3,
    hints: 2,
    wordCount: 3,
    language: "English",
    gameMode: "Normal",
    customWords: "",
    customWordsOnly: false,
  });

  const handleInvite = () => {
    if (typeof window !== "undefined") {
      const inviteUrl = `${window.location.origin}?room=${roomId}`;
      navigator.clipboard.writeText(inviteUrl);
      alert(`Invite link copied to clipboard!\n${inviteUrl}`);
    }
  };

  return (
    <div className="w-full max-w-[1100px] flex flex-col gap-1.5 select-none">
      {/* 1. Top Status Header */}
      <LobbyHeader roomId={roomId} rounds={settings.rounds} />

      {/* 2. 3-Column Lobby Layout */}
      <div className="w-full flex flex-col lg:flex-row items-stretch gap-2 min-h-[540px]">
        {/* Left Column: Player Roster */}
        <div className="w-full lg:w-52 flex-shrink-0">
          <PlayerList
            players={players}
            myPlayerId={myPlayerId}
            hostId={hostId}
          />
        </div>

        {/* Center Column: Room Settings & Launch */}
        <div className="flex-1 bg-[#28324a] rounded border border-[#1b2234] p-4 flex flex-col shadow-lg">
          <LobbySettingsForm
            settings={settings}
            onChange={setSettings}
            isHost={isHost}
            canStart={canStart}
            onStart={() => onStartGame(settings)}
            onInvite={handleInvite}
          />
        </div>

        {/* Right Column: Lobby Chat */}
        <div className="w-full lg:w-72 flex-shrink-0 flex flex-col rounded overflow-hidden shadow-lg">
          <ChatBox
            messages={messages}
            onSendMessage={onSendMessage}
            isDrawer={false}
            hasGuessed={false}
          />
        </div>
      </div>
    </div>
  );
}
