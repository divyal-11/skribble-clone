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
  // Map all players: green if points scored / guessed, red if 0 points scored
  const playerDeltas = players
    .map((p) => {
      const delta = scoreDeltas[p.id] ?? 0;
      const guessed = delta > 0 || p.hasGuessed;
      return {
        id: p.id,
        name: p.name,
        delta,
        guessed,
      };
    })
    .sort((a, b) => b.delta - a.delta);

  const displayReason =
    reason ||
    (playerDeltas.some((p) => p.guessed)
      ? "Everyone guessed the word!"
      : "Time's up!");

  return (
    <div className="absolute inset-0 bg-[#383e56] z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in select-none">
      {/* 1. Word Reveal */}
      <div className="text-2xl sm:text-3xl text-white font-normal mb-1 flex items-center justify-center gap-2.5">
        <span>The word was</span>
        <span className="font-bold text-[#fbc531] text-3xl sm:text-4xl tracking-wide">
          {word}
        </span>
      </div>

      {/* 2. Subtitle Reason */}
      <div className="text-base sm:text-lg text-zinc-300 font-normal mb-5">
        {displayReason}
      </div>

      {/* 3. Points Breakdown: Green for guessed (+pts), Red for not guessed (+0) */}
      {playerDeltas.length > 0 && (
        <div className="flex flex-col gap-1.5 w-72 sm:w-80 max-h-56 overflow-y-auto px-1">
          {playerDeltas.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between text-sm sm:text-base rounded-lg px-3 py-1.5 border transition ${
                p.guessed
                  ? "bg-emerald-500/15 border-emerald-500/40"
                  : "bg-rose-500/10 border-rose-500/30"
              }`}
            >
              <span className="font-bold text-white truncate max-w-[190px]">
                {p.name}
              </span>
              <span
                className={`font-mono font-black tracking-wide ${
                  p.guessed ? "text-[#2ed573]" : "text-[#ff4757]"
                }`}
              >
                +{p.delta}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
