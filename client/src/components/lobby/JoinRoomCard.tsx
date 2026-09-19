import React from "react";
import { Palette, Plus, LogIn } from "lucide-react";

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
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Your Nickname
          </label>
          <input
            type="text"
            placeholder="e.g. Picasso"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={15}
            className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <button
          onClick={onCreateRoom}
          disabled={!isConnected}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Room</span>
        </button>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-zinc-800"></div>
          <span className="flex-shrink mx-4 text-xs font-mono text-zinc-500 uppercase">
            Or join existing
          </span>
          <div className="flex-grow border-t border-zinc-800"></div>
        </div>

        <form onSubmit={onJoinRoom} className="space-y-3">
          <input
            type="text"
            placeholder="Enter 6-letter Room Code"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
            maxLength={6}
            className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono uppercase tracking-widest placeholder-zinc-500 text-center focus:outline-none focus:border-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={!isConnected}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 font-semibold rounded-lg transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Join Room</span>
          </button>
        </form>
      </div>
    </div>
  );
}
