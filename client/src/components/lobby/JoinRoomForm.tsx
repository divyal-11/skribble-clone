import React from "react";
import { LogIn } from "lucide-react";

interface JoinRoomFormProps {
  roomInput: string;
  setRoomInput: (code: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
}

export function JoinRoomForm({
  roomInput,
  setRoomInput,
  onSubmit,
  disabled,
}: JoinRoomFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
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
        disabled={disabled}
        className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 font-semibold rounded-lg transition flex items-center justify-center gap-2"
      >
        <LogIn className="w-4 h-4" />
        <span>Join Room</span>
      </button>
    </form>
  );
}
