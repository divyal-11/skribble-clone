import { Player } from "@/types/events";
import { Avatar } from "@/components/common/Avatar";
import { DoodlCrown } from "@/components/common/DoodlIcons";
import { Trophy, RotateCcw, LogOut } from "lucide-react";

interface GamePodiumProps {
  players: Player[];
  finalScores?: Record<string, number> | null;
  isHost: boolean;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export function GamePodium({
  players,
  finalScores,
  isHost,
  onPlayAgain,
  onLeaveRoom,
}: GamePodiumProps) {
  // Sort players by final score descending
  const ranked = [...players].sort(
    (a, b) => (finalScores?.[b.id] ?? b.score) - (finalScores?.[a.id] ?? a.score)
  );

  const first = ranked[0];
  const second = ranked[1];
  const third = ranked[2];

  return (
    <div className="w-full max-w-2xl bg-[#1d273f]/95 border-4 border-[#0f172a] rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl text-center animate-fade-in">
      <div className="flex items-center gap-2 text-amber-400 mb-6">
        <Trophy className="w-8 h-8 animate-bounce" />
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-white">
          Game Over!
        </h1>
      </div>

      {/* 3D Cartoon Podium (2nd | 1st | 3rd) */}
      <div className="w-full flex items-end justify-center gap-3 sm:gap-6 mb-8 pt-6 min-h-[260px]">
        {/* 2nd Place */}
        {second && (
          <div className="flex-1 flex flex-col items-center">
            <Avatar seed={second.id} size={54} />
            <span className="font-bold text-sm text-zinc-300 mt-1 truncate max-w-[100px]">
              {second.name}
            </span>
            <span className="text-xs text-zinc-400 font-semibold mb-2">
              {finalScores?.[second.id] ?? second.score} pts
            </span>
            <div className="w-full h-28 bg-[#94a3b8] border-3 border-[#475569] rounded-t-2xl flex items-center justify-center shadow-lg">
              <span className="text-4xl font-black text-slate-800">2</span>
            </div>
          </div>
        )}

        {/* 1st Place (Center & Tallest) */}
        {first && (
          <div className="flex-1 flex flex-col items-center relative -top-3">
            <div className="relative">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                <DoodlCrown className="w-8 h-8" />
              </div>
              <Avatar seed={first.id} size={68} isHost={false} />
            </div>
            <span className="font-black text-base text-yellow-300 mt-1 truncate max-w-[120px]">
              {first.name}
            </span>
            <span className="text-xs text-yellow-400/90 font-bold mb-2">
              {finalScores?.[first.id] ?? first.score} pts
            </span>
            <div className="w-full h-36 bg-[#facc15] border-3 border-[#a16207] rounded-t-2xl flex items-center justify-center shadow-xl">
              <span className="text-5xl font-black text-amber-900">1</span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {third && (
          <div className="flex-1 flex flex-col items-center">
            <Avatar seed={third.id} size={48} />
            <span className="font-bold text-sm text-zinc-300 mt-1 truncate max-w-[100px]">
              {third.name}
            </span>
            <span className="text-xs text-zinc-400 font-semibold mb-2">
              {finalScores?.[third.id] ?? third.score} pts
            </span>
            <div className="w-full h-20 bg-[#d97706] border-3 border-[#78350f] rounded-t-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl font-black text-amber-950">3</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        {isHost ? (
          <button
            onClick={onPlayAgain}
            className="skribbl-btn-green px-8 py-3 text-lg font-black uppercase tracking-wider rounded-2xl flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            Play Again
          </button>
        ) : (
          <p className="text-sm text-zinc-400 font-semibold">
            Waiting for host to start next game...
          </p>
        )}

        <button
          onClick={onLeaveRoom}
          className="skribbl-btn-red px-6 py-3 text-base font-bold uppercase tracking-wider rounded-2xl flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Leave
        </button>
      </div>
    </div>
  );
}
