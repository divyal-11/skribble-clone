interface WordOptionButtonProps {
  word: string;
  onSelect: (word: string) => void;
}

export function WordOptionButton({ word, onSelect }: WordOptionButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(word)}
      className="w-full py-3.5 px-4 bg-zinc-950 hover:bg-indigo-950/40 border border-zinc-800 hover:border-indigo-500/50 rounded-xl text-zinc-200 hover:text-white font-semibold tracking-wide uppercase text-sm transition-all duration-150 transform hover:scale-[1.02] active:scale-[0.99] flex items-center justify-between group cursor-pointer"
    >
      <span>{word}</span>
      <span className="text-xs text-zinc-500 group-hover:text-indigo-400 font-normal lowercase transition">
        {word.length} letters
      </span>
    </button>
  );
}
