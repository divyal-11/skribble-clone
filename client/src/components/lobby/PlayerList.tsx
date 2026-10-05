import { Player, TeamId } from "@/types/events";
import { Avatar } from "../common/Avatar";
import { DoodlCrown } from "../common/DoodlIcons";

interface PlayerListProps {
  players: Player[];
  myPlayerId: string;
  hostId: string | null;
  onSwitchTeam?: (teamId: TeamId) => void;
}

const TEAM_CONFIG: Record<string, { label: string; border: string; bg: string; text: string }> = {
  red: { label: "Red", border: "border-l-red-500", bg: "bg-red-500/15", text: "text-red-600" },
  blue: { label: "Blue", border: "border-l-blue-500", bg: "bg-blue-500/15", text: "text-blue-600" },
  green: { label: "Green", border: "border-l-emerald-500", bg: "bg-emerald-500/15", text: "text-emerald-600" },
  yellow: { label: "Yellow", border: "border-l-amber-500", bg: "bg-amber-500/15", text: "text-amber-600" },
};

export function PlayerList({ players, myPlayerId, hostId, onSwitchTeam }: PlayerListProps) {
  const cycleTeam = (currentTeam?: TeamId) => {
    if (!onSwitchTeam) return;
    const teams: TeamId[] = ["red", "blue", "green", "yellow"];
    const currIdx = currentTeam ? teams.indexOf(currentTeam) : -1;
    const nextTeam = teams[(currIdx + 1) % teams.length];
    onSwitchTeam(nextTeam);
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {players.map((p, index) => {
          const isMe = p.id === myPlayerId;
          const isHost = p.id === hostId;
          const team = p.teamId ? TEAM_CONFIG[p.teamId] : null;

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between px-2.5 py-1.5 bg-white text-zinc-900 rounded border border-zinc-300 shadow-sm relative overflow-visible ${
                team ? `border-l-4 ${team.border}` : ""
              }`}
            >
              {/* Left: Rank & Host Crown Badge */}
              <div className="flex flex-col items-center justify-center min-w-[24px]">
                <span className="font-mono text-xs font-black text-zinc-800">
                  #{index + 1}
                </span>
                {isHost && <DoodlCrown className="w-3.5 h-3.5 mt-0.5" />}
              </div>

              {/* Middle: Name (blue) & Score / Team Badge */}
              <div className="flex-1 px-3 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-black text-blue-600 truncate">
                    {p.name} {isMe && <span className="text-blue-500 font-normal">(You)</span>}
                  </p>
                  {team && (
                    <button
                      type="button"
                      disabled={!isMe}
                      onClick={() => cycleTeam(p.teamId)}
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${team.bg} ${team.text} ${
                        isMe ? "cursor-pointer hover:opacity-80" : ""
                      }`}
                      title={isMe ? "Click to switch team" : undefined}
                    >
                      {team.label}
                    </button>
                  )}
                </div>
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
