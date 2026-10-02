import { useEffect, useRef } from "react";
import { ChatMessagePayload } from "@/types/events";

interface ChatMessageListProps {
  messages: ChatMessagePayload[];
}

export function ChatMessageList({ messages =[] }: ChatMessageListProps) {
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
      className="flex-1 overflow-y-auto font-sans text-xs scrollbar-thin select-text bg-white"
    >
      {messages.length === 0 ? (
        <div className="text-zinc-400 text-center py-8 italic text-xs">
          No guesses yet. Be the first to guess!
        </div>
      ) : (
        messages.map((msg, index) => {
          const isEven = index % 2 === 1;

          if (msg.type === "correct") {
            return (
              <div
                key={index}
                className="bg-[#e7ffdf] text-[#22c55e] font-extrabold px-3 py-1 text-center"
              >
                {msg.text}
              </div>
            );
          }

          if (msg.type === "close") {
            return (
              <div
                key={index}
                className="bg-amber-100 text-amber-700 font-bold px-3 py-1 text-center"
              >
                {msg.text}
              </div>
            );
          }

          return (
            <div
              key={index}
              className={`flex items-baseline gap-1.5 px-3 py-1 ${
                isEven ? "bg-[#f5f5f5]" : "bg-white"
              }`}
            >
              <span className="font-extrabold text-zinc-900">{msg.senderName}:</span>
              <span className="break-all font-semibold text-zinc-800">{msg.text}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
