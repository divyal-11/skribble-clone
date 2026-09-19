import React from "react";

interface NicknameInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function NicknameInput({ value, onChange }: NicknameInputProps) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
        Your Nickname
      </label>
      <input
        type="text"
        placeholder="e.g. Picasso"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={15}
        className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
      />
    </div>
  );
}
