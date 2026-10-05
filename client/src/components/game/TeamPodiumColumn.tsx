import { Player } from "@/types/events";
import { Avatar } from "@/components/common/Avatar";
import { DoodlCrown } from "@/components/common/DoodlIcons";

interface TeamPodiumColumnProps {
  teamKey: string;
  label: string;
  colorBorder: string;
  colorBg: string;
  colorText: string;
  score: number;
  players: Player[];
  isWinner: boolean;
}

export function TeamPodiumColumn({
  label,
  colorBorder,
  colorBg,
  colorText,
  score,
  players,
  isWinner,
}: TeamPodiumColumnProps) {
  return (
    <div className={`flex-1 min-w-[140px] max-w-[220px] rounded-2xl border-2 ${colorBorder} ${colorBg} p-3 flex flex-col items-center shadow-lg relative`}>
      {isWinner && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <DoodlCrown className="w-7 h-7" />
        </div>
      )}

      {/* Team Title & Score */}
      <h3 className={`font-black text-sm uppercase tracking-wider ${colorText} mt-1`}>
        {label}
      </h3>
      <span className="font-mono font-black text-lg text-white mb-3">
        {score} pts
      </span>

      {/* Player Roster Breakdown */}
      <div className="w-full flex flex-col gap-1.5 overflow-y-auto max-h-48 pr-0.5">
        {players.map((p, idx) => (
          <div
            key={p.id}
            className="flex items-center justify-between bg-black/20 rounded-lg px-2 py-1 text-xs"
          >
            <div className="flex items-center gap-1.5 truncate max-w-[110px]">
              <span className="text-[10px] text-zinc-400 font-mono">#{idx + 1}</span>
              <Avatar seed={p.name || p.id} size={22} isHost={false} />
              <span className="font-bold text-white truncate">{p.name}</span>
            </div>
            <span className="font-mono font-bold text-emerald-400">
              {p.score || 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
