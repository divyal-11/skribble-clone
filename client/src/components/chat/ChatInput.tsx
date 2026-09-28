import { useState } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
  disabledPlaceholder?: string;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  disabledPlaceholder,
}: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = text.trim();
    if (!cleanText || disabled) return;

    onSendMessage(cleanText);
    setText("");
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder={
            disabled
              ? (disabledPlaceholder || "You cannot guess right now")
              : "Type your guess here..."
          }
          maxLength={50}
          className="flex-1 px-3.5 py-2 bg-zinc-950 border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl transition flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
          title="Send Guess"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}
