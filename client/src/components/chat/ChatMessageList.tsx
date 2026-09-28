import { useEffect, useRef } from "react";
import { ChatMessagePayload } from "@/types/events";

interface ChatMessageListProps {
  messages: ChatMessagePayload[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-2.5 font-sans text-xs scrollbar-thin scrollbar-thumb-zinc-700"
    >
      {messages.length === 0 ? (
        <div className="text-zinc-600 text-center py-8 italic">
          No guesses yet. Be the first to guess!
        </div>
      ) : (
        messages.map((msg, index) => {
          if (msg.type === "correct") {
            return (
              <div
                key={index}
                className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-3 py-1.5 rounded-lg text-center"
              >
                {msg.text}
              </div>
            );
          }

          if (msg.type === "close") {
            return (
              <div
                key={index}
                className="bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold px-3 py-1.5 rounded-lg text-center"
              >
                {msg.text}
              </div>
            );
          }

          return (
            <div key={index} className="flex gap-1.5 text-zinc-300">
              <span className="font-bold text-zinc-400">{msg.senderName}:</span>
              <span className="break-all">{msg.text}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
