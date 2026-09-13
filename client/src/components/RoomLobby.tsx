import { useState } from 'react';
import { Player } from '@/types/events';
import { Users, Crown, Copy, Check, LogOut } from 'lucide-react';

interface RoomLobbyProps {
  roomId: string;
  players: Player[];
  myPlayerId: string;
  onLeaveRoom: () => void;
}

export function RoomLobby({
  roomId,
  players,
  myPlayerId,
  onLeaveRoom,
}: RoomLobbyProps) {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
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

      <div className="mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>Players in Lobby ({players.length})</span>
        </h3>

        <div className="space-y-2">
          {players.map((p, index) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-zinc-950 border border-zinc-800/80 px-4 py-3 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs font-bold font-mono">
                  {index + 1}
                </span>
                <span className="font-medium text-zinc-200">
                  {p.name}{' '}
                  {p.id === myPlayerId && (
                    <span className="text-xs text-zinc-500">(You)</span>
                  )}
                </span>
              </div>
              {index === 0 && (
                <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  <span>Host</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onLeaveRoom}
          className="w-full py-2.5 bg-zinc-800 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-900/50 border border-transparent text-zinc-300 font-semibold rounded-lg transition flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Leave Room</span>
        </button>
      </div>
    </div>
  );
}
