interface AvatarProps {
  seed: string;
  size?: number; // e.g. 48
  isHost?: boolean;
  className?: string;
}

export function Avatar({ seed, size = 48, isHost = false, className = "" }: AvatarProps) {
  // Deterministic color & expression based on player seed
  let hash = 0;
  for (let i = 0; i < (seed || "p").length; i++) {
    hash = (hash << 5) - hash + (seed || "p").charCodeAt(i);
    hash |= 0;
  }
  const h = Math.abs(hash);

  // Skribbl classic body colors
  const skribblColors = [
    "#3b82f6", // Blue (like the screenshot!)
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#ef4444", // Red
    "#f97316", // Orange
    "#eab308", // Yellow
    "#22c55e", // Green
    "#06b6d4", // Cyan
  ];

  const bodyColor = skribblColors[h % skribblColors.length];
  const eyeStyle = h % 3;
  const mouthStyle = (h >> 2) % 3;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`overflow-visible select-none ${className}`}
    >
      {/* Crown for Host - Tilted on top-left of head */}
      {isHost && (
        <g transform="translate(10, 4) rotate(-22 25 18)">
          <path
            d="M 12 24 L 16 8 L 26 16 L 36 8 L 40 24 Z"
            fill="#facc15"
            stroke="#040a33"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="8" r="2.5" fill="#ef4444" />
          <circle cx="26" cy="16" r="2.5" fill="#3b82f6" />
          <circle cx="36" cy="8" r="2.5" fill="#ef4444" />
        </g>
      )}

      {/* Skribbl Blob Body */}
      <path
        d="M 20 45 C 16 22, 32 16, 50 16 C 68 16, 84 22, 80 45 C 84 75, 70 86, 50 86 C 30 86, 16 75, 20 45 Z"
        fill={bodyColor}
        stroke="#18181b"
        strokeWidth="5"
        strokeLinejoin="round"
      />

      {/* Shading lines on bottom of body */}
      <path
        d="M 30 76 Q 50 82 70 76"
        fill="none"
        stroke="#18181b"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* Eyes */}
      {eyeStyle === 0 ? (
        // Big cartoon eyes
        <g>
          <ellipse cx="40" cy="42" rx="8" ry="10" fill="#ffffff" stroke="#18181b" strokeWidth="4" />
          <ellipse cx="60" cy="42" rx="8" ry="10" fill="#ffffff" stroke="#18181b" strokeWidth="4" />
          <circle cx="42" cy="43" r="4.5" fill="#18181b" />
          <circle cx="62" cy="43" r="4.5" fill="#18181b" />
          <circle cx="44" cy="40" r="1.5" fill="#ffffff" />
          <circle cx="64" cy="40" r="1.5" fill="#ffffff" />
        </g>
      ) : eyeStyle === 1 ? (
        // Happy squints ^ ^
        <g stroke="#18181b" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M 33 44 Q 40 36 47 44" />
          <path d="M 53 44 Q 60 36 67 44" />
        </g>
      ) : (
        // Silly derp / wink
        <g>
          <ellipse cx="38" cy="42" rx="9" ry="11" fill="#ffffff" stroke="#18181b" strokeWidth="4" />
          <circle cx="40" cy="43" r="5" fill="#18181b" />
          <circle cx="42" cy="39" r="1.5" fill="#ffffff" />
          <path d="M 56 42 Q 62 38 68 44" stroke="#18181b" strokeWidth="5" strokeLinecap="round" fill="none" />
        </g>
      )}

      {/* Mouth */}
      {mouthStyle === 0 ? (
        // Open wavy cartoon mouth with tongue
        <g>
          <path
            d="M 36 58 Q 50 74 64 58 Q 50 62 36 58 Z"
            fill="#991b1b"
            stroke="#18181b"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path d="M 43 64 Q 50 61 57 64 Q 50 71 43 64 Z" fill="#f87171" />
        </g>
      ) : mouthStyle === 1 ? (
        // Grinning teeth smile
        <path
          d="M 36 58 Q 50 70 64 58 Z"
          fill="#ffffff"
          stroke="#18181b"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      ) : (
        // Cute wavy smirk
        <path
          d="M 38 60 Q 50 68 62 58"
          fill="none"
          stroke="#18181b"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
