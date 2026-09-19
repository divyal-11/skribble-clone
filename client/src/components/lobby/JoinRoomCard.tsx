import React from "react";
import { Palette } from "lucide-react";
import { NicknameInput } from "./NicknameInput";
import { CreateRoomButton } from "./CreateRoomButton";
import { JoinRoomForm } from "./JoinRoomForm";

interface JoinRoomCardProps {
  playerName: string;
  setPlayerName: (name: string) => void;
  roomInput: string;
  setRoomInput: (code: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (e: React.FormEvent) => void;
  isConnected: boolean;
}

export function JoinRoomCard({
  playerName,
  setPlayerName,
  roomInput,
  setRoomInput,
  onCreateRoom,
  onJoinRoom,
  isConnected,
}: JoinRoomCardProps) {
  return (
    <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
      <h1 className="text-3xl font-extrabold text-center mb-2 tracking-tight flex items-center justify-center gap-2">
        <Palette className="w-8 h-8 text-indigo-500" />
        <span>Skribbl Clone</span>
      </h1>

      <p className="text-zinc-400 text-center text-sm mb-6">
        Enter your name to create or join a room
      </p>

      <div className="space-y-4">
        <NicknameInput value={playerName} onChange={setPlayerName} />

        <CreateRoomButton onClick={onCreateRoom} disabled={!isConnected} />

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-zinc-800" />
          <span className="flex-shrink mx-4 text-xs font-mono text-zinc-500 uppercase">
            Or join existing
          </span>
          <div className="flex-grow border-t border-zinc-800" />
        </div>

        <JoinRoomForm
          roomInput={roomInput}
          setRoomInput={setRoomInput}
          onSubmit={onJoinRoom}
          disabled={!isConnected}
        />
      </div>
    </div>
  );
}
