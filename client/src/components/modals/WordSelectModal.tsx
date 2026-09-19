import { useState, useEffect } from "react";
import { Palette, Clock } from "lucide-react";
import { WordOptionButton } from "./WordOptionButton";
import { TimerProgressBar } from "./TimerProgressBar";

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
        {/* Header with countdown */}
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
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/80 border border-zinc-700/60 rounded-full text-xs font-mono font-semibold text-amber-400">
            <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Word Options */}
        <div className="grid grid-cols-1 gap-3">
          {words.map((word) => (
            <WordOptionButton
              key={word}
              word={word}
              onSelect={onSelectWord}
            />
          ))}
        </div>

        {/* Time Progress Bar */}
        <TimerProgressBar timeLeft={timeLeft} timeLimit={timeLimit} />
      </div>
    </div>
  );
}
