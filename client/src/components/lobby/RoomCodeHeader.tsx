import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface RoomCodeHeaderProps {
  roomId: string;
}

export function RoomCodeHeader({ roomId }: RoomCodeHeaderProps) {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
      <div>
        <p className="text-xs uppercase font-semibold tracking-wider text-zinc-400">
          Room Code
        </p>
        <h2 className="text-3xl font-black font-mono tracking-widest text-indigo-400">
          {roomId}
        </h2>
      </div>
      <button
        type="button"
        onClick={copyRoomCode}
        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-mono rounded-lg transition flex items-center gap-1.5"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 text-zinc-400" />
            <span>Copy Code</span>
          </>
        )}
      </button>
    </div>
  );
}
