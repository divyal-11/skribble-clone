interface TimerProgressBarProps {
  timeLeft: number;
  timeLimit: number;
}

export function TimerProgressBar({
  timeLeft,
  timeLimit,
}: TimerProgressBarProps) {
  const percentage = (timeLeft / timeLimit) * 100;

  return (
    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
      <div
        className="bg-indigo-500 h-full transition-all duration-1000 ease-linear rounded-full"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
