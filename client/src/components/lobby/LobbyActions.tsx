import { Play, LogOut } from "lucide-react";

interface LobbyActionsProps {
  isHost: boolean;
  canStart: boolean;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export function LobbyActions({
  isHost,
  canStart,
  onStartGame,
  onLeaveRoom,
}: LobbyActionsProps) {
  return (
    <div className="space-y-3">
      {isHost ? (
        <div>
          <button
            type="button"
            onClick={onStartGame}
            disabled={!canStart}
            className={`w-full py-3 px-4 font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg ${
              canStart
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-[0.99] cursor-pointer"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50"
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Game</span>
          </button>
          {!canStart && (
            <p className="text-xs text-zinc-500 text-center mt-2">
              Need at least 2 players to start the game
            </p>
          )}
        </div>
      ) : (
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 text-center">
          <p className="text-xs text-zinc-400 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Waiting for host to start the game...
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
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
