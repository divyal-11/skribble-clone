import { Player } from "@/types/events";
import { Avatar } from "@/components/common/Avatar";
import { DoodlCrown, DoodlTrophy } from "@/components/common/DoodlIcons";
import { SoloPodiumRemaining, RankedPlayerEntry } from "./SoloPodiumRemaining";

interface SoloPodiumProps {
  first?: Player;
  second?: Player;
  third?: Player;
  firstScore: number;
  secondScore: number;
  thirdScore: number;
  remaining?: RankedPlayerEntry[];
}

export function SoloPodium({
  first,
  second,
  third,
  firstScore,
  secondScore,
  thirdScore,
  remaining = [],
}: SoloPodiumProps) {
  return (
    <div className="w-full flex flex-col items-center mb-8">
      {/* Top 3 Podium Pedestals */}
      <div className="w-full flex items-end justify-center gap-4 sm:gap-8 min-h-[260px]">
      {/* 2nd Place */}
      {second && (
        <div className="w-36 sm:w-44 flex flex-col items-center">
          <Avatar seed={second.name || second.id} size={60} isHost={false} />
          <div className="w-full h-28 sm:h-32 border-2 border-zinc-400 rounded-t-xl relative bg-black/10">
            <span className="absolute top-2 left-3 font-bold text-lg text-zinc-400">#2</span>
            <div className="flex flex-col items-center justify-center h-full pt-3 px-2">
              <span className="font-bold text-sm text-white truncate max-w-[120px]">{second.name}</span>
              <span className="text-xs text-zinc-300 font-normal">{secondScore} points</span>
            </div>
          </div>
        </div>
      )}

      {/* 1st Place */}
      {first && (
        <div className="w-40 sm:w-52 flex flex-col items-center">
          <div className="relative mb-0 flex items-center justify-center">
            <div className="absolute -top-7 left-1 -rotate-[18deg] z-10">
              <DoodlCrown className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <Avatar seed={first.name || first.id} size={74} isHost={false} />
            <div className="absolute -top-2 -right-8 rotate-[14deg] z-10">
              <DoodlTrophy className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
          </div>
          <div className="w-full h-36 sm:h-42 border-2 border-[#fbc531] rounded-t-xl relative bg-black/10">
            <span className="absolute top-2 left-3 font-bold text-lg text-[#fbc531]">#1</span>
            <div className="flex flex-col items-center justify-center h-full pt-4 px-2">
              <span className="font-bold text-base text-[#fbc531] truncate max-w-[140px]">{first.name}</span>
              <span className="text-xs text-[#fbc531] font-normal">{firstScore} points</span>
            </div>
          </div>
        </div>
      )}

        {/* 3rd Place */}
        {third && (
          <div className="w-36 sm:w-44 flex flex-col items-center">
            <Avatar seed={third.name || third.id} size={52} isHost={false} />
            <div className="w-full h-20 sm:h-24 border-2 border-amber-600 rounded-t-xl relative bg-black/10">
              <span className="absolute top-2 left-3 font-bold text-lg text-amber-600">#3</span>
              <div className="flex flex-col items-center justify-center h-full pt-3 px-2">
                <span className="font-bold text-sm text-white truncate max-w-[120px]">{third.name}</span>
                <span className="text-xs text-amber-500 font-normal">{thirdScore} points</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Remaining Players below Podium */}
      <SoloPodiumRemaining remaining={remaining} />
    </div>
  );
}
