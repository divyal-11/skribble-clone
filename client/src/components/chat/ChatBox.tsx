import { MessageSquare } from "lucide-react";
import { ChatMessagePayload } from "@/types/events";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";

interface ChatBoxProps {
  messages: ChatMessagePayload[];
  onSendMessage: (text: string) => void;
  isDrawer: boolean;
  hasGuessed: boolean;
}

export function ChatBox({
  messages,
  onSendMessage,
  isDrawer,
  hasGuessed,
}: ChatBoxProps) {
  const disabled = isDrawer || hasGuessed;
  const disabledPlaceholder = isDrawer
    ? "You are drawing! Chat disabled"
    : hasGuessed
    ? "You guessed the word! Shh..."
    : undefined;

  return (
    <div className="flex flex-col h-full min-h-[400px] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* 1. Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
          <MessageSquare className="w-4 h-4" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
          Chat & Guesses
        </h3>
      </div>

      {/* 2. Message List */}
      <ChatMessageList messages={messages} />

      {/* 3. Input Form */}
      <ChatInput
        onSendMessage={onSendMessage}
        disabled={disabled}
        disabledPlaceholder={disabledPlaceholder}
      />
    </div>
  );
}
