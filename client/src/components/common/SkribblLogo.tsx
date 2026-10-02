"use client";

import { useEffect, useRef, useState } from "react";

interface SkribblLogoProps {
  size?: "default" | "large";
}

export function SkribblLogo({ size = "default" }: SkribblLogoProps) {
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!logoRef.current) return;
      const rect = logoRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const distance = Math.min(4, Math.hypot(e.clientX - centerX, e.clientY - centerY) / 30);
      setPupil({ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance });
    };

    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  const letters = [
    { char: "d", color: "#ef4444", isEye: false },
    { char: "o", color: "#f97316", isEye: true },
    { char: "o", color: "#eab308", isEye: true },
    { char: "d", color: "#22c55e", isEye: false },
    { char: "l", color: "#06b6d4", isEye: false },
    { char: ".", color: "#8b5cf6", isEye: false },
    { char: "i", color: "#ec4899", isEye: false },
    { char: "o", color: "#f43f5e", isEye: false },
  ];

  const scale = size === "large" ? "text-5xl sm:text-6xl" : "text-3xl sm:text-4xl";

  return (
    <div ref={logoRef} className="flex flex-col items-center justify-center select-none py-2 cursor-pointer group">
      <div className={`flex items-baseline font-black tracking-tight ${scale}`}>
        {letters.map((l, i) => (
          <span
            key={i}
            style={{
              color: l.color,
              WebkitTextStroke: "2.5px #040a33",
              paintOrder: "stroke fill",
              textShadow: "0 5px 0 #040a33, 2px 6px 8px rgba(0,0,0,0.35)",
              animation: `doodl_float 2.2s ease-in-out infinite`,
              animationDelay: `${i * 0.12}s`,
            }}
            className="relative inline-flex items-center justify-center transition-transform hover:-translate-y-2 hover:scale-125"
          >
            {l.char}
            {l.isEye && (
              <span className="absolute inset-0 m-auto w-[34%] h-[34%] bg-white rounded-full flex items-center justify-center overflow-hidden border border-zinc-900 pointer-events-none">
                <span
                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-black rounded-full transition-transform duration-75"
                  style={{ transform: `translate(${pupil.x}px, ${pupil.y}px)` }}
                />
              </span>
            )}
          </span>
        ))}

        {/* Mascot Cartoon Pencil */}
        <svg
          className="w-8 h-8 sm:w-10 sm:h-10 ml-2 animate-bounce group-hover:rotate-45 transition-transform duration-300"
          viewBox="0 0 64 64"
          fill="none"
        >
          <rect x="22" y="10" width="20" height="34" rx="2" fill="#fbbf24" stroke="#040a33" strokeWidth="4" />
          <rect x="22" y="6" width="20" height="8" rx="2" fill="#f472b6" stroke="#040a33" strokeWidth="4" />
          <rect x="22" y="14" width="20" height="4" fill="#9ca3af" stroke="#040a33" strokeWidth="2" />
          <polygon points="22,44 42,44 32,58" fill="#fde68a" stroke="#040a33" strokeWidth="4" strokeLinejoin="round" />
          <polygon points="29,53 35,53 32,58" fill="#040a33" />
        </svg>
      </div>

      {/* Animated Hand-Drawn Squiggle Underline */}
      {/* <svg className="w-48 sm:w-64 h-3 mt-1 overflow-visible" viewBox="0 0 200 12" fill="none">
        <path
          d="M 5 6 Q 30 1, 55 6 T 105 6 T 155 6 T 195 6"
          stroke="#fde047"
          strokeWidth="3.5"
          strokeLinecap="round"
          className="opacity-80"
        />
      </svg> */}
    </div>
  );
}
