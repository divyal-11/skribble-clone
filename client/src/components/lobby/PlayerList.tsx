import { Player } from "@/types/events";
import { Users, Crown } from "lucide-react";

interface PlayerListProps {
  players: Player[];
  myPlayerId: string;
  hostId: string | null;
}

export function PlayerList({ players, myPlayerId, hostId }: PlayerListProps) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" />
        <span>Players in Lobby ({players.length})</span>
      </h3>

      <div className="space-y-2">
        {players.map((p, index) => (
          <div
            key={p.id}
            className="flex items-center justify-between bg-zinc-950 border border-zinc-800/80 px-4 py-3 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs font-bold font-mono">
                {index + 1}
              </span>
              <span className="font-medium text-zinc-200">
                {p.name}{" "}
                {p.id === myPlayerId && (
                  <span className="text-xs text-zinc-500">(You)</span>
                )}
              </span>
            </div>
            {p.id === hostId && (
              <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Crown className="w-3 h-3" />
                <span>Host</span>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
