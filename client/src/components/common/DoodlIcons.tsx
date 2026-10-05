interface IconProps {
  className?: string;
}

// ⏰ Cartoon Alarm Clock with vibrating bells & centered value
export function DoodlClock({ value = "0", className = "w-10 h-10" }: { value?: string | number; className?: string }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
        {/* Snappy Ringing Bells */}
        <path d="M12 9 C8 12 7 17 9 20" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" style={{ animation: "doodl_ring 0.5s ease-in-out infinite" }} />
        <path d="M36 9 C40 12 41 17 39 20" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" style={{ animation: "doodl_ring 0.5s ease-in-out infinite reverse" }} />
        {/* Legs */}
        <line x1="14" y1="40" x2="10" y2="45" stroke="#040a33" strokeWidth="4" strokeLinecap="round" />
        <line x1="34" y1="40" x2="38" y2="45" stroke="#040a33" strokeWidth="4" strokeLinecap="round" />
        {/* Body */}
        <circle cx="24" cy="27" r="16" fill="#ffffff" stroke="#040a33" strokeWidth="3.5" />
      </svg>
      <span className="absolute font-black text-zinc-900 text-xs sm:text-sm pt-2">{value}</span>
    </div>
  );
}

// 👥 Players: Two cute cartoon heads bobbing briskly
export function DoodlPlayers({ className = "w-7 h-7" }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={`hover:scale-125 transition-transform ${className}`}>
      <circle cx="12" cy="11" r="6" fill="#38bdf8" stroke="#040a33" strokeWidth="2.5" />
      <circle cx="21" cy="15" r="5.5" fill="#f472b6" stroke="#040a33" strokeWidth="2.5" style={{ animation: "doodl_bob 0.6s ease-in-out infinite" }} />
      <path d="M5 28 C5 21 19 21 19 28" fill="#38bdf8" stroke="#040a33" strokeWidth="2.5" />
      <path d="M16 28 C16 23 28 23 28 28" fill="#f472b6" stroke="#040a33" strokeWidth="2.5" />
    </svg>
  );
}

// 🌐 Language: Cute spinning world globe
export function DoodlLanguage({ className = "w-7 h-7" }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={`hover:scale-125 transition-transform ${className}`} style={{ animation: "doodl_wobble 0.8s ease-in-out infinite" }}>
      <circle cx="16" cy="16" r="11" fill="#34d399" stroke="#040a33" strokeWidth="2.5" />
      <ellipse cx="16" cy="16" rx="5" ry="11" stroke="#040a33" strokeWidth="2" />
      <line x1="5" y1="16" x2="27" y2="16" stroke="#040a33" strokeWidth="2" />
    </svg>
  );
}

// ⏱️ Drawtime: Stopwatch with fast-ticking hand
export function DoodlDrawtime({ className = "w-7 h-7" }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={`hover:scale-125 transition-transform ${className}`}>
      <circle cx="16" cy="18" r="10" fill="#fbbf24" stroke="#040a33" strokeWidth="2.5" />
      <rect x="14" y="4" width="4" height="4" rx="1" fill="#ef4444" stroke="#040a33" strokeWidth="2" />
      <line x1="16" y1="18" x2="22" y2="14" stroke="#040a33" strokeWidth="2.5" strokeLinecap="round" className="animate-spin origin-[16px_18px]" style={{ animationDuration: "1.2s" }} />
    </svg>
  );
}

// 🔄 Rounds: Continuous rotating arrow loop
export function DoodlRounds({ className = "w-7 h-7" }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={`hover:scale-125 transition-transform ${className}`} style={{ animation: "spin 2.5s linear infinite" }}>
      <path d="M16 6 A10 10 0 1 1 6 16" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" />
      <polygon points="12,6 18,3 18,9" fill="#a78bfa" />
    </svg>
  );
}

// 🎮 Game Mode: Retro Arcade Gamepad with lively bounce
export function DoodlGameMode({ className = "w-7 h-7" }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={`hover:scale-125 transition-transform ${className}`} style={{ animation: "doodl_bob 0.7s ease-in-out infinite" }}>
      <rect x="4" y="9" width="24" height="15" rx="5" fill="#f87171" stroke="#040a33" strokeWidth="2.5" />
      <path d="M8 16 h6 M11 13 v6" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="21" cy="14" r="1.5" fill="#ffffff" className="animate-pulse" />
      <circle cx="24" cy="17" r="1.5" fill="#ffffff" className="animate-pulse" />
    </svg>
  );
}

// 🎴 Word Count: Stacked flashcards that fan out quickly
export function DoodlWordCount({ className = "w-7 h-7" }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={`hover:scale-125 transition-transform ${className}`}>
      <rect x="6" y="8" width="16" height="18" rx="2" fill="#e2e8f0" stroke="#040a33" strokeWidth="2" style={{ animation: "doodl_fan 0.8s ease-in-out infinite", transformOrigin: "14px 22px" }} />
      <rect x="11" y="8" width="16" height="18" rx="2" fill="#60a5fa" stroke="#040a33" strokeWidth="2" />
      <line x1="14" y1="13" x2="23" y2="13" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="18" x2="20" y2="18" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 💡 Hints: Glowing lightbulb with pulsing illumination
export function DoodlHints({ className = "w-7 h-7" }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={`hover:scale-125 transition-transform ${className}`} style={{ animation: "doodl_glow 0.8s ease-in-out infinite" }}>
      <path d="M12 21 h8 M13 24 h6" stroke="#040a33" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M10 12 C10 7 22 7 22 12 C22 16 19 17 19 20 L13 20 C13 17 10 16 10 12 Z" fill="#facc15" stroke="#040a33" strokeWidth="2.5" />
    </svg>
  );
}

// 👑 Host Crown: Sparkly Gold Crown with gleaming jewel
export function DoodlCrown({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)] ${className}`} style={{ animation: "doodl_wobble 1s ease-in-out infinite" }}>
      <polygon points="2,19 22,19 20,8 15,13 12,5 9,13 4,8" fill="#facc15" stroke="#854d0e" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="5" r="1.8" fill="#ef4444" className="animate-pulse" />
      <circle cx="4" cy="8" r="1.4" fill="#3b82f6" />
      <circle cx="20" cy="8" r="1.4" fill="#3b82f6" />
    </svg>
  );
}

// ✏️ Drawing Pencil: Animated pencil indicating active drawer
export function DoodlPencil({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] ${className}`} style={{ animation: "doodl_wobble 0.7s ease-in-out infinite" }}>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" fill="#f59e0b" stroke="#040a33" strokeWidth="2" strokeLinejoin="round" />
      <path d="M15 5l4 4" stroke="#040a33" strokeWidth="2" strokeLinecap="round" />
      <circle cx="3.8" cy="20.2" r="0.8" fill="#ef4444" />
    </svg>
  );
}

// 🏆 Gold Trophy: Skribbl-authentic winner trophy
export function DoodlTrophy({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={`drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] ${className}`}>
      {/* Cup bowl */}
      <path d="M7 6 h18 v8 c0 5 -3 9 -9 9 c-6 0 -9 -4 -9 -9 Z" fill="#facc15" stroke="#040a33" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Handles */}
      <path d="M7 8 H4 c-1.5 0 -2.5 1.5 -2.5 3 c0 3 2 5 5.5 5.5" stroke="#040a33" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M25 8 h3 c1.5 0 2.5 1.5 2.5 3 c0 3 -2 5 -5.5 5.5" stroke="#040a33" strokeWidth="2.5" strokeLinecap="round" />
      {/* Stem & Base */}
      <path d="M16 23 v4" stroke="#040a33" strokeWidth="3" strokeLinecap="round" />
      <path d="M10 27 h12" stroke="#040a33" strokeWidth="3" strokeLinecap="round" />
      <rect x="9" y="27" width="14" height="3" rx="1" fill="#f59e0b" stroke="#040a33" strokeWidth="2" />
    </svg>
  );
}

