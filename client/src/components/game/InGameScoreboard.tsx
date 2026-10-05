import { Player, TeamId } from "@/types/events";
import { Avatar } from "../common/Avatar";
import { DoodlCrown, DoodlPencil } from "../common/DoodlIcons";
import { Check } from "lucide-react";

interface InGameScoreboardProps {
  players: Player[];
  myPlayerId: string;
  hostId: string | null;
  currentDrawerId: string | null;
  teamScores?: Record<string, number>;
  isRoundEnd?: boolean;
  turnScores?: Record<string, number>;
}

const TEAM_CONFIG: Record<string, { label: string; border: string; bg: string; text: string }> = {
  red: { label: "Red", border: "border-l-red-500", bg: "bg-red-500/15", text: "text-red-500" },
  blue: { label: "Blue", border: "border-l-blue-500", bg: "bg-blue-500/15", text: "text-blue-500" },
  green: { label: "Green", border: "border-l-emerald-500", bg: "bg-emerald-500/15", text: "text-emerald-500" },
  yellow: { label: "Yellow", border: "border-l-amber-500", bg: "bg-amber-500/15", text: "text-amber-500" },
};

export function InGameScoreboard({
  players,
  myPlayerId,
  hostId,
  currentDrawerId,
  teamScores,
  isRoundEnd,
  turnScores,
}: InGameScoreboardProps) {
  // Sort players by score descending
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  const hasTeams = Object.keys(teamScores || {}).length > 0;

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Optional Team Scores Header */}
      {hasTeams && teamScores && (
        <div className="grid grid-cols-2 gap-1.5 p-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-sm">
          {Object.entries(teamScores).map(([tId, score]) => {
            const config = TEAM_CONFIG[tId];
            if (!config) return null;
            return (
              <div
                key={tId}
                className={`flex items-center justify-between px-2 py-1 rounded text-xs font-bold ${config.bg} ${config.text}`}
              >
                <span>{config.label}</span>
                <span className="font-mono">{score} pts</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Players Leaderboard */}
      <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-0.5">
        {sortedPlayers.map((p, index) => {
          const isMe = p.id === myPlayerId;
          const isHost = p.id === hostId;
          const isDrawer = p.id === currentDrawerId;
          const delta = turnScores?.[p.id] ?? 0;
          const hasGuessed = p.hasGuessed || delta > 0;
          const team = p.teamId ? TEAM_CONFIG[p.teamId] : null;

          const isCardGuessed = hasGuessed;
          const isCardMissed = Boolean(isRoundEnd && !hasGuessed && !isDrawer);

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between px-2 py-1.5 rounded transition-all duration-300 relative border ${
                isCardGuessed
                  ? "bg-emerald-500/15 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                  : isCardMissed
                  ? "bg-rose-500/10 border-rose-500/40"
                  : isDrawer
                  ? "bg-amber-500/10 border-amber-500/50"
                  : "bg-white text-zinc-900 border-zinc-300 shadow-sm"
              } ${team ? `border-l-4 ${team.border}` : ""}`}
            >
              {/* Left: Rank & Host Crown Badge */}
              <div className="flex flex-col items-center justify-center min-w-[22px]">
                <span
                  className={`font-mono text-xs font-black ${
                    isCardGuessed
                      ? "text-emerald-400"
                      : isCardMissed
                      ? "text-rose-400"
                      : isDrawer
                      ? "text-amber-400"
                      : "text-zinc-800"
                  }`}
                >
                  #{index + 1}
                </span>
                {isHost && <DoodlCrown className="w-3.5 h-3.5 mt-0.5" />}
              </div>

              {/* Middle: Name, Score & Status Badges */}
              <div className="flex-1 px-2.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p
                    className={`text-xs font-black truncate ${
                      isCardGuessed
                        ? "text-emerald-300"
                        : isCardMissed
                        ? "text-rose-300"
                        : isDrawer
                        ? "text-amber-300"
                        : "text-blue-600"
                    }`}
                  >
                    {p.name} {isMe && <span className="font-normal opacity-75">(You)</span>}
                  </p>

                  {team && (
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1 py-0.2 rounded ${team.bg} ${team.text}`}
                    >
                      {team.label}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  <p
                    className={`text-[11px] font-bold ${
                      isCardGuessed
                        ? "text-emerald-400"
                        : isCardMissed
                        ? "text-rose-400 font-extrabold"
                        : isDrawer
                        ? "text-amber-400/90"
                        : "text-zinc-500"
                    }`}
                  >
                    {p.score || 0} pts
                    {isRoundEnd && (
                      <span className="font-mono text-[10px] ml-1">
                        {isCardGuessed
                          ? `(+${delta})`
                          : isCardMissed
                          ? "(+0)"
                          : delta > 0
                          ? `(+${delta})`
                          : ""}
                      </span>
                    )}
                  </p>

                  {/* Status Indicator */}
                  {isDrawer && (
                    <span className="flex items-center gap-1 text-[10px] font-black text-amber-500 animate-pulse">
                      <DoodlPencil className="w-3 h-3" />
                      Drawing
                    </span>
                  )}
                  {hasGuessed && (
                    <span className="flex items-center gap-0.5 text-[10px] font-black text-emerald-500">
                      <Check className="w-3 h-3 stroke-[3]" />
                      Guessed!
                    </span>
                  )}
                  {isCardMissed && (
                    <span className="text-[10px] font-black text-rose-400">
                      Missed
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Skribbl Blob Avatar */}
              <div className="flex-shrink-0 flex items-center justify-center">
                <Avatar seed={p.name || p.id} size={38} isHost={isHost} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
