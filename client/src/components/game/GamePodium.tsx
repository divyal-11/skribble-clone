import { Player } from "@/types/events";
import { Avatar } from "@/components/common/Avatar";
import { DoodlCrown, DoodlTrophy } from "@/components/common/DoodlIcons";
import { RotateCcw, LogOut } from "lucide-react";

interface GamePodiumProps {
  players: Player[];
  finalScores?: Record<string, number> | null;
  teamScores?: Record<string, number>;
  isHost: boolean;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

const TEAM_CONFIG: Record<string, { label: string; border: string; bg: string; text: string; badgeBg: string }> = {
  red: { label: "Red Team", border: "border-red-500", bg: "bg-red-500/15", text: "text-red-400", badgeBg: "bg-red-600" },
  blue: { label: "Blue Team", border: "border-blue-500", bg: "bg-blue-500/15", text: "text-blue-400", badgeBg: "bg-blue-600" },
  green: { label: "Green Team", border: "border-emerald-500", bg: "bg-emerald-500/15", text: "text-emerald-400", badgeBg: "bg-emerald-600" },
  yellow: { label: "Yellow Team", border: "border-amber-500", bg: "bg-amber-500/15", text: "text-amber-400", badgeBg: "bg-amber-600" },
};

export function GamePodium({
  players,
  finalScores,
  teamScores,
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

  const firstScore = first ? (finalScores?.[first.id] ?? first.score) : 0;
  const secondScore = second ? (finalScores?.[second.id] ?? second.score) : 0;
  const thirdScore = third ? (finalScores?.[third.id] ?? third.score) : 0;

  const teamEntries = teamScores && Object.keys(teamScores).length > 0
    ? Object.entries(teamScores).sort((a, b) => b[1] - a[1])
    : [];
  const winningTeamEntry = teamEntries.length > 0 ? teamEntries[0] : null;
  const winningTeam = winningTeamEntry ? TEAM_CONFIG[winningTeamEntry[0]] : null;

  return (
    <div className="w-full max-w-4xl bg-[#2d3246] rounded-3xl p-6 sm:p-12 flex flex-col items-center shadow-2xl text-center animate-fade-in border-4 border-[#1e2333] select-none">
      {/* 1. Winner Announcement */}
      {first ? (
        <div className="text-2xl sm:text-4xl text-white font-normal mb-8 sm:mb-12 flex items-center justify-center gap-2.5">
          <span className="font-bold text-[#fbc531]">{first.name}</span>
          <span>is the winner!</span>
        </div>
      ) : (
        <div className="text-3xl text-white font-normal mb-8">Game Over!</div>
      )}

      {/* 🏆 Winning Team Banner (if Team Mode) */}
      {winningTeam && winningTeamEntry && (
        <div className={`w-full max-w-md p-3 mb-8 rounded-2xl border-2 ${winningTeam.border} ${winningTeam.bg} flex items-center justify-between shadow-lg`}>
          <div className="flex items-center gap-2.5">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase text-white ${winningTeam.badgeBg}`}>
              Winning Team
            </span>
            <span className={`font-black text-lg ${winningTeam.text}`}>
              {winningTeam.label}
            </span>
          </div>
          <span className="font-mono font-black text-xl text-white">
            {winningTeamEntry[1]} pts
          </span>
        </div>
      )}

      {/* 2. Skribbl Open Outline Podiums */}
      <div className="w-full flex items-end justify-center gap-4 sm:gap-8 mb-10 min-h-[280px]">
        {/* 2nd Place Podium (Left) */}
        {second && (
          <div className="w-36 sm:w-48 flex flex-col items-center">
            {/* Avatar */}
            <div className="relative mb-0 flex items-center justify-center">
              <Avatar seed={second.name || second.id} size={64} isHost={false} />
            </div>

            {/* Outlined Podium Box */}
            <div className="w-full h-28 sm:h-32 border-2 border-zinc-400 rounded-t-xl relative bg-black/10">
              <span className="absolute top-2 left-3 font-bold text-lg sm:text-xl text-zinc-400">
                #2
              </span>
              <div className="flex flex-col items-center justify-center h-full pt-3 px-2">
                <span className="font-bold text-sm sm:text-base text-white truncate max-w-[130px]">
                  {second.name}
                </span>
                <span className="text-xs sm:text-sm text-zinc-300 font-normal mt-0.5">
                  {secondScore} points
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 1st Place Podium (Winner - Tallest) */}
        {first && (
          <div className="w-40 sm:w-56 flex flex-col items-center">
            {/* Avatar with Crown and Trophy */}
            <div className="relative mb-0 flex items-center justify-center">
              <div className="absolute -top-7 left-1 -rotate-[18deg] z-10">
                <DoodlCrown className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <Avatar seed={first.name || first.id} size={76} isHost={false} />
              <div className="absolute -top-2 -right-8 sm:-right-10 rotate-[14deg] z-10">
                <DoodlTrophy className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>
            </div>

            {/* Outlined Podium Box */}
            <div className="w-full h-36 sm:h-44 border-2 border-[#fbc531] rounded-t-xl relative bg-black/10">
              <span className="absolute top-2 left-3 font-bold text-lg sm:text-xl text-[#fbc531]">
                #1
              </span>
              <div className="flex flex-col items-center justify-center h-full pt-4 px-2">
                <span className="font-bold text-base sm:text-lg text-[#fbc531] truncate max-w-[150px]">
                  {first.name}
                </span>
                <span className="text-xs sm:text-sm text-[#fbc531] font-normal mt-0.5">
                  {firstScore} points
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3rd Place Podium (Right - if 3+ players) */}
        {third && (
          <div className="w-36 sm:w-48 flex flex-col items-center">
            {/* Avatar */}
            <div className="relative mb-0 flex items-center justify-center">
              <Avatar seed={third.name || third.id} size={56} isHost={false} />
            </div>

            {/* Outlined Podium Box */}
            <div className="w-full h-20 sm:h-24 border-2 border-amber-600 rounded-t-xl relative bg-black/10">
              <span className="absolute top-2 left-3 font-bold text-lg sm:text-xl text-amber-600">
                #3
              </span>
              <div className="flex flex-col items-center justify-center h-full pt-3 px-2">
                <span className="font-bold text-sm sm:text-base text-white truncate max-w-[130px]">
                  {third.name}
                </span>
                <span className="text-xs sm:text-sm text-amber-500 font-normal mt-0.5">
                  {thirdScore} points
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Action Buttons */}
      <div className="flex items-center gap-4 mt-2">
        {isHost ? (
          <button
            onClick={onPlayAgain}
            className="skribbl-btn-green px-8 py-3 text-lg font-black uppercase tracking-wider rounded-2xl flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Play Again</span>
          </button>
        ) : (
          <p className="text-sm text-zinc-400 font-semibold">
            Waiting for host to start next game...
          </p>
        )}

        <button
          onClick={onLeaveRoom}
          className="skribbl-btn-blue px-6 py-3 text-base font-bold uppercase tracking-wider rounded-2xl flex items-center gap-2 cursor-pointer shadow-lg"
        >
          <LogOut className="w-4 h-4" />
          <span>Leave Room</span>
        </button>
      </div>
    </div>
  );
}
