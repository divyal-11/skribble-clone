import { Player } from "@/types/events";
import { Avatar } from "../common/Avatar";
import { DoodlCrown } from "../common/DoodlIcons";

interface PlayerListProps {
  players: Player[];
  myPlayerId: string;
  hostId: string | null;
}

export function PlayerList({ players, myPlayerId, hostId }: PlayerListProps) {
  return (
    <div className="w-full flex flex-col gap-2">
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {players.map((p, index) => {
          const isMe = p.id === myPlayerId;
          const isHost = p.id === hostId;

          return (
            <div
              key={p.id}
              className="flex items-center justify-between px-2.5 py-1.5 bg-white text-zinc-900 rounded border border-zinc-300 shadow-sm relative overflow-visible"
            >
              {/* Left: Rank & Host Crown Badge */}
              <div className="flex flex-col items-center justify-center min-w-[24px]">
                <span className="font-mono text-xs font-black text-zinc-800">
                  #{index + 1}
                </span>
                {isHost && (
                  <DoodlCrown className="w-3.5 h-3.5 mt-0.5" />
                )}
              </div>

              {/* Middle: Name (blue) & Score */}
              <div className="flex-1 px-3 min-w-0">
                <p className="text-xs font-black text-blue-600 truncate">
                  {p.name} {isMe && <span className="text-blue-500 font-normal">(You)</span>}
                </p>
                <p className="text-[11px] font-bold text-zinc-500">
                  {p.score || 0} points
                </p>
              </div>

              {/* Right: Skribbl Blob Avatar with Host Crown */}
              <div className="flex-shrink-0 flex items-center justify-center">
                <Avatar seed={p.name || p.id} size={44} isHost={isHost} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
