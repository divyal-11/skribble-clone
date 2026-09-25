import { Pencil, Clock } from "lucide-react";

interface CanvasHeaderProps {
  isDrawer: boolean;
  drawerName?: string;
  word?: string;
  maskedWord?: string;
  timeLeft?: number;
}

export function CanvasHeader({
  isDrawer,
  drawerName,
  word,
  maskedWord,
  timeLeft = 60,
}: CanvasHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
      {/* Role / Drawer info */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
          <Pencil className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {isDrawer ? "Your Turn" : "Drawer"}
          </p>
          <p className="text-sm font-bold text-white">
            {isDrawer ? "You are drawing!" : `${drawerName || "Someone"} is drawing`}
          </p>
        </div>
      </div>

      {/* Secret Word or Masked Blanks */}
      <div className="text-center">
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-0.5">
          {isDrawer ? "Word to Draw" : "Guess the Word"}
        </p>
        <p className="text-xl font-mono font-black tracking-widest text-indigo-400">
          {isDrawer ? (word || "...") : (maskedWord || "_ _ _ _")}
        </p>
      </div>

      {/* Timer Badge */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-full font-mono text-xs font-bold text-amber-400">
        <Clock className="w-3.5 h-3.5" />
        <span>{timeLeft}s</span>
      </div>
    </div>
  );
}
