import { Player } from "@/types/events";
import { TeamPodiumColumn } from "./TeamPodiumColumn";
import { SoloPodium } from "./SoloPodium";
import { RotateCcw, LogOut } from "lucide-react";

interface GamePodiumProps {
  players: Player[];
  finalScores?: Record<string, number> | null;
  teamScores?: Record<string, number>;
  playersByTeam?: Record<string, Player[]>;
  isHost: boolean;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

const TEAM_CONFIG: Record<string, { label: string; border: string; bg: string; text: string }> = {
  red: { label: "Red Team", border: "border-red-500", bg: "bg-red-500/15", text: "text-red-400" },
  blue: { label: "Blue Team", border: "border-blue-500", bg: "bg-blue-500/15", text: "text-blue-400" },
  green: { label: "Green Team", border: "border-emerald-500", bg: "bg-emerald-500/15", text: "text-emerald-400" },
  yellow: { label: "Yellow Team", border: "border-amber-500", bg: "bg-amber-500/15", text: "text-amber-400" },
};

export function GamePodium({
  players,
  finalScores,
  teamScores = {},
  playersByTeam = {},
  isHost,
  onPlayAgain,
  onLeaveRoom,
}: GamePodiumProps) {
  const ranked = [...players].sort((a, b) => (finalScores?.[b.id] ?? b.score) - (finalScores?.[a.id] ?? a.score));
  const teamEntries = Object.entries(teamScores).sort((a, b) => b[1] - a[1]);
  const isTeamMode = players.some((p) => Boolean(p.teamId)) || teamEntries.length > 0;

  const isTie = teamEntries.length >= 2 && teamEntries[0][1] === teamEntries[1][1];
  const winnerTeamKey = teamEntries.length > 0 ? teamEntries[0][0] : null;

  return (
    <div className="w-full max-w-4xl bg-[#2d3246] rounded-3xl p-6 sm:p-10 flex flex-col items-center shadow-2xl text-center animate-fade-in border-4 border-[#1e2333] select-none">
      {/* Title */}
      <div className="text-2xl sm:text-3xl text-white font-normal mb-6 flex items-center justify-center gap-2">
        {isTeamMode ? (
          isTie ? (
            <span className="font-bold text-amber-300">It's a Tie!</span>
          ) : (
            <>
              <span className={`font-black ${TEAM_CONFIG[winnerTeamKey || ""]?.text || "text-amber-400"}`}>
                {TEAM_CONFIG[winnerTeamKey || ""]?.label || "Team"}
              </span>
              <span>Wins the Race!</span>
            </>
          )
        ) : (
          <>
            <span className="font-bold text-[#fbc531]">{ranked[0]?.name || "Winner"}</span>
            <span>is the winner!</span>
          </>
        )}
      </div>

      {/* Main Podium Display: Team Mode vs Solo Mode */}
      {isTeamMode ? (
        <div className="w-full flex flex-wrap items-stretch justify-center gap-3 sm:gap-4 mb-8">
          {teamEntries.map(([tKey, score]) => {
            const cfg = TEAM_CONFIG[tKey] || { label: tKey, border: "border-zinc-500", bg: "bg-zinc-800/40", text: "text-white" };
            const teamRoster = playersByTeam[tKey] || players.filter((p) => p.teamId === tKey).sort((a, b) => (finalScores?.[b.id] ?? b.score) - (finalScores?.[a.id] ?? a.score));
            return (
              <TeamPodiumColumn
                key={tKey}
                teamKey={tKey}
                label={cfg.label}
                colorBorder={cfg.border}
                colorBg={cfg.bg}
                colorText={cfg.text}
                score={score}
                players={teamRoster}
                isWinner={!isTie && tKey === winnerTeamKey}
              />
            );
          })}
        </div>
      ) : (
        <SoloPodium
          first={ranked[0]}
          second={ranked[1]}
          third={ranked[2]}
          firstScore={ranked[0] ? (finalScores?.[ranked[0].id] ?? ranked[0].score) : 0}
          secondScore={ranked[1] ? (finalScores?.[ranked[1].id] ?? ranked[1].score) : 0}
          thirdScore={ranked[2] ? (finalScores?.[ranked[2].id] ?? ranked[2].score) : 0}
        />
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-4 mt-2">
        {isHost ? (
          <button
            onClick={onPlayAgain}
            className="skribbl-btn-green px-7 py-2.5 text-base font-black uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
        ) : (
          <p className="text-sm text-zinc-400 font-semibold">Waiting for host...</p>
        )}
        <button
          onClick={onLeaveRoom}
          className="skribbl-btn-blue px-6 py-2.5 text-sm font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 cursor-pointer shadow-lg"
        >
          <LogOut className="w-4 h-4" />
          <span>Leave Room</span>
        </button>
      </div>
    </div>
  );
}
