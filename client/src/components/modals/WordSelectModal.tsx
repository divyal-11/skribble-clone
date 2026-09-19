import { useState, useEffect } from "react";
import { Palette, Clock } from "lucide-react";

interface WordSelectModalProps {
  words: string[];
  onSelectWord: (word: string) => void;
  timeLimit?: number;
}

export function WordSelectModal({
  words,
  onSelectWord,
  timeLimit = 30,
}: WordSelectModalProps) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (words.length > 0) {
        const randomIndex = Math.floor(Math.random() * words.length);
        onSelectWord(words[randomIndex]);
      }
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, words, onSelectWord]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Your Turn to Draw!</h2>
              <p className="text-xs text-zinc-400">Choose one word from the options below</p>
            </div>
          </div>
          {/* Countdown Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/80 border border-zinc-700/60 rounded-full text-xs font-mono font-semibold text-amber-400">
            <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Word Selection Options */}
        <div className="grid grid-cols-1 gap-3">
          {words.map((word) => (
            <button
              key={word}
              onClick={() => onSelectWord(word)}
              className="w-full py-3.5 px-4 bg-zinc-950 hover:bg-indigo-950/40 border border-zinc-800 hover:border-indigo-500/50 rounded-xl text-zinc-200 hover:text-white font-semibold tracking-wide uppercase text-sm transition-all duration-150 transform hover:scale-[1.02] active:scale-[0.99] flex items-center justify-between group cursor-pointer"
            >
              <span>{word}</span>
              <span className="text-xs text-zinc-500 group-hover:text-indigo-400 font-normal lowercase transition">
                {word.length} letters
              </span>
            </button>
          ))}
        </div>

        {/* Time Progress Bar */}
        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-indigo-500 h-full transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${(timeLeft / timeLimit) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
