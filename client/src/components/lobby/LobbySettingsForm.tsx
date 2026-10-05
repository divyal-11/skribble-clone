import { Link as LinkIcon, Users } from "lucide-react";
import { RoomSettings } from "@/types/events";
import {
  DoodlPlayers,
  DoodlLanguage,
  DoodlDrawtime,
  DoodlRounds,
  DoodlGameMode,
  DoodlWordCount,
  DoodlHints,
} from "@/components/common/DoodlIcons";

interface LobbySettingsFormProps {
  settings: RoomSettings;
  onChange: (newSettings: RoomSettings) => void;
  isHost: boolean;
  canStart: boolean;
  onStart: () => void;
  onInvite: (team?: string) => void;
}

export function LobbySettingsForm({
  settings,
  onChange,
  isHost,
  canStart,
  onStart,
  onInvite,
}: LobbySettingsFormProps) {
  const update = (patch: Partial<RoomSettings>) => {
    if (!isHost) return;
    onChange({ ...settings, ...patch });
  };

  const fields = [
    {
      label: "Players",
      Icon: DoodlPlayers,
      value: settings.maxPlayers,
      options: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20],
      onChange: (v: string) => update({ maxPlayers: Number(v) }),
    },
    {
      label: "Language",
      Icon: DoodlLanguage,
      value: settings.language,
      options: ["English", "German", "French", "Spanish", "Italian", "Russian", "Japanese"],
      onChange: (v: string) => update({ language: v }),
    },
    {
      label: "Drawtime",
      Icon: DoodlDrawtime,
      value: settings.drawTime,
      options: [15, 20, 30, 45, 60, 70, 80, 90, 100, 120, 150, 180, 240],
      onChange: (v: string) => update({ drawTime: Number(v) }),
    },
    {
      label: "Rounds",
      Icon: DoodlRounds,
      value: settings.rounds,
      options: [2, 3, 4, 5, 6, 7, 8, 9, 10],
      onChange: (v: string) => update({ rounds: Number(v) }),
    },
    {
      label: "Game Mode",
      Icon: DoodlGameMode,
      value: settings.gameMode,
      options: ["Normal", "Team", "Hidden", "Combination"],
      onChange: (v: string) => update({ gameMode: v }),
    },
    ...(settings.gameMode === "Team"
      ? [
          {
            label: "Teams",
            Icon: DoodlPlayers,
            value: settings.teamCount || 2,
            options: [2, 3, 4],
            onChange: (v: string) => update({ teamCount: Number(v) }),
          },
        ]
      : []),
    {
      label: "Word Count",
      Icon: DoodlWordCount,
      value: settings.wordCount,
      options: [1, 2, 3, 4, 5],
      onChange: (v: string) => update({ wordCount: Number(v) }),
    },
    {
      label: "Hints",
      Icon: DoodlHints,
      value: settings.hints,
      options: [0, 1, 2, 3, 4, 5],
      onChange: (v: string) => update({ hints: Number(v) }),
    },
  ];

  return (
    <div className="flex flex-col gap-2.5 h-full justify-between">
      {/* 1-Column Settings List matching Skribbl */}
      <div className="flex flex-col gap-2">
        {fields.map((f, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 py-0.5"
          >
            <div className="flex items-center gap-2.5 select-none">
              <f.Icon className="w-6 h-6 text-white" />
              <span className="text-sm font-extrabold text-white">
                {f.label}
              </span>
            </div>

            <select
              value={f.value}
              disabled={!isHost}
              onChange={(e) => f.onChange(e.target.value)}
              className="w-1/2 sm:w-[55%] bg-white text-zinc-900 font-extrabold text-sm rounded px-3 py-1 outline-none border border-zinc-400 focus:border-[#56b2fd] cursor-pointer disabled:opacity-80"
            >
              {f.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Custom Words Section */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-white">
            Custom words
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <span className="text-xs font-bold text-zinc-300">
              Use custom words only
            </span>
            <input
              type="checkbox"
              disabled={!isHost}
              checked={settings.customWordsOnly}
              onChange={(e) => update({ customWordsOnly: e.target.checked })}
              className="w-4 h-4 rounded cursor-pointer accent-emerald-500"
            />
          </label>
        </div>

        <textarea
          disabled={!isHost}
          value={settings.customWords}
          onChange={(e) => update({ customWords: e.target.value })}
          placeholder="Minimum of 10 words. 1-32 characters per word! 20000 characters maximum. Separated by a , (comma)"
          className="w-full h-32 sm:h-36 bg-white text-zinc-900 placeholder:text-zinc-500 text-xs sm:text-sm rounded p-2.5 resize-none outline-none border border-zinc-400 focus:border-[#56b2fd] disabled:opacity-80"
        />
      </div>

      {/* Host Controls: Start (70%) & Invite (30%) */}
      <div className="flex items-center gap-2 pt-2">
        {isHost ? (
          <button
            onClick={onStart}
            disabled={!canStart}
            className={`skribbl-btn-green w-[70%] py-2.5 rounded font-black text-lg uppercase tracking-wider text-black transition ${
              canStart ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
            }`}
          >
            Start!
          </button>
        ) : (
          <div className="w-[70%] py-2.5 text-center text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded">
            Waiting for host to start...
          </div>
        )}

        <button
          onClick={() => onInvite()}
          className="skribbl-btn-blue w-[30%] py-2.5 rounded font-black text-lg uppercase tracking-wider text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <img src="/img/link.svg" alt="link" className="w-4 h-4 invert" />
          <span>Invite</span>
        </button>
      </div>

      {/* Team-Specific Invite Links */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10 mt-1">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">
          Team Invite Links:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => onInvite("red")}
            className="px-2 py-1.5 bg-red-600/20 hover:bg-red-600/35 border border-red-500/80 rounded text-xs font-bold text-red-200 flex items-center justify-center gap-1 cursor-pointer transition"
          >
            <Users className="w-3.5 h-3.5 text-red-400" />
            <span>Red Team</span>
          </button>
          <button
            type="button"
            onClick={() => onInvite("blue")}
            className="px-2 py-1.5 bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/80 rounded text-xs font-bold text-blue-200 flex items-center justify-center gap-1 cursor-pointer transition"
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Blue Team</span>
          </button>
          <button
            type="button"
            onClick={() => onInvite("green")}
            className="px-2 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/80 rounded text-xs font-bold text-emerald-200 flex items-center justify-center gap-1 cursor-pointer transition"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Green Team</span>
          </button>
          <button
            type="button"
            onClick={() => onInvite("yellow")}
            className="px-2 py-1.5 bg-amber-600/20 hover:bg-amber-600/35 border border-amber-500/80 rounded text-xs font-bold text-amber-200 flex items-center justify-center gap-1 cursor-pointer transition"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Yellow Team</span>
          </button>
        </div>
      </div>
    </div>
  );
}
