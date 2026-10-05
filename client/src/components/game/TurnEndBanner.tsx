import { Player } from "@/types/events";

interface TurnEndBannerProps {
  word: string;
  players?: Player[];
  scoreDeltas?: Record<string, number>;
  reason?: string;
}

export function TurnEndBanner({
  word,
  players = [],
  scoreDeltas = {},
  reason,
}: TurnEndBannerProps) {
  // Find all players who scored points this turn, sorted highest delta first
  const scoredPlayers = players
    .map((p) => ({
      name: p.name,
      delta: scoreDeltas[p.id] || 0,
    }))
    .filter((p) => p.delta > 0)
    .sort((a, b) => b.delta - a.delta);

  const displayReason =
    reason ||
    (scoredPlayers.length === 0
      ? "Time's up!"
      : "Everyone guessed the word!");

  return (
    <div className="absolute inset-0 bg-[#383e56] z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in select-none">
      {/* 1. Word Reveal */}
      <div className="text-2xl sm:text-3xl text-white font-normal mb-1.5 flex items-center justify-center gap-2.5">
        <span>The word was</span>
        <span className="font-bold text-[#fbc531] text-3xl sm:text-4xl tracking-wide">
          {word}
        </span>
      </div>

      {/* 2. Subtitle Reason */}
      <div className="text-base sm:text-lg text-zinc-300 font-normal mb-8">
        {displayReason}
      </div>

      {/* 3. Points Breakdown */}
      {scoredPlayers.length > 0 && (
        <div className="flex flex-col gap-2.5 w-64 sm:w-72">
          {scoredPlayers.map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-between text-base sm:text-lg"
            >
              <span className="font-medium text-white truncate max-w-[190px]">
                {p.name}
              </span>
              <span className="font-bold text-[#2ed573] font-mono tracking-wide">
                +{p.delta}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
