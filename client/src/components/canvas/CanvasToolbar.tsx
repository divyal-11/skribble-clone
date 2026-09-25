import { Eraser, Trash2 } from "lucide-react";

interface CanvasToolbarProps {
  color: string;
  setColor: (color: string) => void;
  size: number;
  setSize: (size: number) => void;
  onClear: () => void;
  disabled: boolean;
}

const COLORS = [
  "#000000", "#ffffff", "#ef4444", "#3b82f6",
  "#22c55e", "#eab308", "#f97316", "#a855f7",
];
const SIZES = [3, 6, 12];

export function CanvasToolbar({
  color,
  setColor,
  size,
  setSize,
  onClear,
  disabled,
}: CanvasToolbarProps) {
  if (disabled) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
      {/* Colors */}
      <div className="flex items-center gap-1.5">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            style={{ backgroundColor: c }}
            className={`w-6 h-6 rounded-full border transition ${
              color === c ? "border-indigo-400 scale-110" : "border-zinc-700 hover:scale-105"
            }`}
          />
        ))}
      </div>

      {/* Brush Sizes */}
      <div className="flex items-center gap-2">
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            className={`p-1.5 rounded-lg border transition ${
              size === s ? "bg-zinc-800 border-indigo-400" : "border-zinc-700 hover:bg-zinc-800"
            }`}
          >
            <div
              className="rounded-full bg-white"
              style={{ width: `${s + 2}px`, height: `${s + 2}px` }}
            />
          </button>
        ))}

        {/* Eraser */}
        <button
          type="button"
          onClick={() => setColor("#18181b")}
          className={`p-2 rounded-lg border transition ${
            color === "#18181b" ? "bg-zinc-800 border-indigo-400 text-indigo-400" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
          }`}
          title="Eraser"
        >
          <Eraser className="w-4 h-4" />
        </button>

        {/* Clear Canvas */}
        <button
          type="button"
          onClick={onClear}
          className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-rose-400 hover:border-rose-900/50 hover:bg-rose-950/30 transition"
          title="Clear Canvas"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
