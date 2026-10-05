import React, { useState } from "react";
import { Shuffle, ArrowLeft, ArrowRight, Play, LogIn, Users } from "lucide-react";
import { Avatar } from "../common/Avatar";

interface JoinRoomCardProps {
  playerName: string;
  setPlayerName: (name: string) => void;
  roomInput: string;
  setRoomInput: (code: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (e: React.FormEvent) => void;
  isConnected: boolean;
  inviteRoomCode?: string | null;
  inviteTeam?: string | null;
  onClearInvite?: () => void;
}

const TEAM_INVITE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  red: { label: "Red Team", badgeClass: "bg-red-500/20 text-red-300 border-red-500/80" },
  blue: { label: "Blue Team", badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/80" },
  green: { label: "Green Team", badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/80" },
  yellow: { label: "Yellow Team", badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/80" },
};

export function JoinRoomCard({
  playerName,
  setPlayerName,
  roomInput,
  setRoomInput,
  onCreateRoom,
  onJoinRoom,
  isConnected,
  inviteRoomCode,
  inviteTeam,
  onClearInvite,
}: JoinRoomCardProps) {
  const [avatarIndex, setAvatarIndex] = useState(0);
  const sampleSeeds = ["doodler", "sparky", "blaze", "pixel", "cosmo", "boba", "momo", "waffles"];
  const currentSeed = playerName.trim() || sampleSeeds[avatarIndex % sampleSeeds.length];

  const handleRandomize = () => {
    setAvatarIndex((prev) => prev + 1);
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md bg-[#0e2c84]/90 border-2 border-[#040a33] rounded-2xl p-6 sm:p-7 shadow-[0_12px_32px_rgba(0,0,0,0.5)] flex flex-col gap-4 text-white backdrop-blur-sm select-none">
      {/* 1. Name & Language Row */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={18}
          className="flex-1 px-3.5 py-2.5 bg-white text-zinc-900 placeholder:text-zinc-400 font-extrabold text-sm rounded-lg outline-none border border-zinc-400 focus:border-[#56b2fd] shadow-inner"
        />
        <select className="bg-white text-zinc-900 font-extrabold text-sm rounded-lg px-3 py-2.5 outline-none border border-zinc-400 cursor-pointer shadow-inner">
          <option>English</option>
          <option>German</option>
          <option>French</option>
          <option>Spanish</option>
        </select>
      </div>

      {/* 2. Interactive Avatar Customizer */}
      <div className="relative flex items-center justify-center py-2 bg-[#091e5c]/80 rounded-xl border border-[#040a33]/60 shadow-inner">
        {/* Left Arrow */}
        <button
          type="button"
          onClick={() => setAvatarIndex((prev) => (prev > 0 ? prev - 1 : sampleSeeds.length - 1))}
          className="p-2 hover:scale-125 transition-transform text-white/70 hover:text-white cursor-pointer"
          title="Previous Avatar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Live Bouncy Avatar */}
        <div className="px-6 flex items-center justify-center hover:scale-110 transition-transform duration-150">
          <Avatar seed={currentSeed} size={70} />
        </div>

        {/* Right Arrow */}
        <button
          type="button"
          onClick={() => setAvatarIndex((prev) => prev + 1)}
          className="p-2 hover:scale-125 transition-transform text-white/70 hover:text-white cursor-pointer"
          title="Next Avatar"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* Randomize Dice Button */}
        <button
          type="button"
          onClick={handleRandomize}
          className="absolute right-3.5 p-1.5 bg-[#1b43aa] hover:bg-[#2556d6] rounded-lg text-amber-300 hover:scale-110 transition cursor-pointer shadow"
          title="Randomize Avatar!"
        >
          <Shuffle className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Action Section: Invite Mode vs Standard Mode */}
      {inviteRoomCode ? (
        <div className="flex flex-col gap-2.5">
          {inviteTeam && TEAM_INVITE_CONFIG[inviteTeam.toLowerCase()] && (
            <div className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border text-xs font-black uppercase tracking-wider ${TEAM_INVITE_CONFIG[inviteTeam.toLowerCase()].badgeClass}`}>
              <Users className="w-3.5 h-3.5" />
              <span>Joining {TEAM_INVITE_CONFIG[inviteTeam.toLowerCase()].label}</span>
            </div>
          )}

          {/* Big Green Play! Button */}
          <button
            type="button"
            onClick={onJoinRoom}
            disabled={!isConnected}
            className="skribbl-btn-green w-full py-3.5 rounded-xl font-black text-2xl tracking-wider text-black flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-lg"
          >
            <Play className="w-6 h-6 fill-black" />
            <span>Play!</span>
          </button>

          {/* Secondary: Create Private Room instead */}
          <button
            type="button"
            onClick={onClearInvite}
            className="skribbl-btn-blue w-full py-2.5 rounded-xl font-bold text-sm tracking-wide text-white transition cursor-pointer shadow"
          >
            Create Private Room
          </button>
        </div>
      ) : (
        <>
          {/* Standard Mode: Big Green 3D Create Room Button */}
          <button
            type="button"
            onClick={onCreateRoom}
            disabled={!isConnected}
            className="skribbl-btn-green w-full py-3.5 rounded-xl font-black text-xl uppercase tracking-wider text-black flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <Play className="w-5 h-5 fill-black" />
            <span>Create Room</span>
          </button>

          {/* Join Existing Room Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/20" />
            <span className="flex-shrink mx-3 text-xs font-bold text-blue-200 uppercase tracking-widest">
              Or Join with Code
            </span>
            <div className="flex-grow border-t border-white/20" />
          </div>

          {/* Join Room Code Form */}
          <form onSubmit={onJoinRoom} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="ENTER ROOM CODE"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
              maxLength={6}
              className="flex-1 px-3.5 py-2.5 bg-white text-zinc-900 placeholder:text-zinc-400 font-mono font-black text-sm uppercase text-center rounded-lg outline-none border border-zinc-400 focus:border-[#56b2fd] shadow-inner"
            />
            <button
              type="submit"
              disabled={!isConnected || !roomInput.trim()}
              className="skribbl-btn-blue px-5 py-2.5 rounded-lg font-black text-sm uppercase tracking-wider text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>Join</span>
            </button>
          </form>
        </>
      )}
    </div>
  );
}
