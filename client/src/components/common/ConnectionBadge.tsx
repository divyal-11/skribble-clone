interface ConnectionBadgeProps {
  isConnected: boolean;
}

export function ConnectionBadge({ isConnected }: ConnectionBadgeProps) {
  return (
    <div className="flex items-center gap-2 mb-8 bg-zinc-900 border border-zinc-800 px-4 py-1.5 rounded-full text-sm">
      <span
        className={`w-2.5 h-2.5 rounded-full ${
          isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
        }`}
      />
      <span className="text-zinc-400 font-mono">
        {isConnected ? "Server Connected" : "Connecting to Server..."}
      </span>
    </div>
  );
}
