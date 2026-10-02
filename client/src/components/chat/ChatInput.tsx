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
    <form onSubmit={handleSubmit} className="p-2 border-t border-zinc-200 bg-white">
      <div className="flex items-center gap-1.5">
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
          maxLength={100}
          className="flex-1 px-3 py-1.5 bg-white border border-zinc-300 rounded text-zinc-900 placeholder:text-zinc-400 text-xs sm:text-sm font-semibold outline-none focus:border-[#56b2fd] disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-30 text-white rounded font-bold text-xs transition cursor-pointer disabled:cursor-not-allowed"
          title="Send"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}
