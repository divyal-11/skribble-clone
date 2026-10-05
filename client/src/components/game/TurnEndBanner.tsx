import { Sparkles } from "lucide-react";
import { Player } from "@/types/events";
import { Avatar } from "../common/Avatar";

interface TurnEndBannerProps {
  word: string;
  players?: Player[];
}

export function TurnEndBanner({ word, players }: TurnEndBannerProps) {
  const topPlayers = players
    ? [...players].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 3)
    : [];

  return (
    <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2 animate-bounce">
        <Sparkles className="w-7 h-7" />
      </div>

      <p className="text-xs font-bold tracking-widest uppercase text-zinc-400 mb-0.5">
        The word was
      </p>

      <h2 className="text-3xl sm:text-4xl font-black text-[#56ce27] tracking-wider uppercase drop-shadow-[0_4px_16px_rgba(86,206,39,0.35)] mb-3">
        {word}
      </h2>

      {/* Mini Scoreboard Recap */}
      {topPlayers.length > 0 && (
        <div className="flex items-center justify-center gap-3 mb-4 w-full max-w-sm">
          {topPlayers.map((p, idx) => (
            <div
              key={p.id}
              className="flex flex-col items-center bg-zinc-900/90 border border-zinc-700/60 rounded-xl px-3 py-2 flex-1 shadow-md"
            >
              <span className="text-[10px] font-black text-amber-400 mb-1">
                #{idx + 1}
              </span>
              <Avatar seed={p.name || p.id} size={32} />
              <span className="text-xs font-bold text-white truncate max-w-[70px] mt-1">
                {p.name}
              </span>
              <span className="text-[11px] font-black text-emerald-400 mt-0.5">
                {p.score || 0} pts
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full animate-[shrink_5s_linear_forwards]" />
      </div>

      <p className="text-xs text-zinc-500 font-semibold mt-2.5">
        Next turn starting shortly...
      </p>
    </div>
  );
}
