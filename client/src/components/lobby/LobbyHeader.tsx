import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { DoodlClock } from "@/components/common/DoodlIcons";

interface LobbyHeaderProps {
  roomId: string;
  rounds: number;
}

export function LobbyHeader({ roomId, rounds }: LobbyHeaderProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full flex items-center justify-between px-3 py-2 bg-white rounded-t-lg shadow-md border-b border-zinc-300 select-none">
      {/* Animated Clock & Round Indicator */}
      <div className="flex items-center gap-2">
        <DoodlClock value="0" className="w-10 h-10" />
        <span className="font-extrabold text-zinc-900 text-sm sm:text-base">
          Round 1 of {rounds}
        </span>
      </div>

      {/* WAITING State Text */}
      <div className="font-black text-zinc-700 tracking-wider uppercase text-xs sm:text-sm">
        WAITING
      </div>

      {/* Right: Room Code */}
      <button
        onClick={copyCode}
        className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded font-bold text-xs text-zinc-800 transition cursor-pointer"
        title="Click to copy Room Code"
      >
        <span>Room: {roomId}</span>
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-600" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-zinc-500" />
        )}
      </button>
    </div>
  );
}
