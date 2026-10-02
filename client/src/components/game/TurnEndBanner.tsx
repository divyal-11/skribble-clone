import { Sparkles } from "lucide-react";

interface TurnEndBannerProps {
  word: string;
}

export function TurnEndBanner({ word }: TurnEndBannerProps) {
  return (
    <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3 animate-bounce">
        <Sparkles className="w-8 h-8" />
      </div>

      <p className="text-sm font-bold tracking-widest uppercase text-zinc-400 mb-1">
        The word was
      </p>

      <h2 className="text-4xl sm:text-5xl font-black text-[#56ce27] tracking-wider uppercase drop-shadow-[0_4px_16px_rgba(86,206,39,0.35)] mb-4">
        {word}
      </h2>

      <div className="w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full animate-[shrink_5s_linear_forwards]" />
      </div>

      <p className="text-xs text-zinc-500 font-semibold mt-2.5">
        Next round starting shortly...
      </p>
    </div>
  );
}
