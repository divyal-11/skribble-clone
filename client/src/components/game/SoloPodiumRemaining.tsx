import { Player } from "@/types/events";
import { Avatar } from "@/components/common/Avatar";

export interface RankedPlayerEntry {
  player: Player;
  score: number;
  rank: number;
}

interface SoloPodiumRemainingProps {
  remaining: RankedPlayerEntry[];
}

export function SoloPodiumRemaining({ remaining }: SoloPodiumRemainingProps) {
  if (!remaining || remaining.length === 0) return null;

  return (
    <div className="w-full max-w-xl flex flex-col gap-2 pt-6 border-t border-white/10 mt-2">
      <span className="text-xs font-black text-zinc-400 uppercase tracking-widest text-center">
        Remaining Players
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {remaining.map(({ player, score, rank }) => (
          <div
            key={player.id}
            className="flex items-center justify-between bg-black/25 border border-white/10 rounded-xl px-3 py-2 shadow-sm"
          >
            <div className="flex items-center gap-2.5 truncate">
              <span className="font-mono text-sm font-black text-zinc-400 w-6">#{rank}</span>
              <Avatar seed={player.name || player.id} size={28} isHost={false} />
              <span className="font-bold text-sm text-white truncate max-w-[130px]">
                {player.name}
              </span>
            </div>
            <span className="font-mono text-xs font-extrabold text-zinc-300">
              {score} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
