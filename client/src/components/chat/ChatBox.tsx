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
  hasGuessed = false,
}: ChatBoxProps) {
  const disabled = isDrawer || hasGuessed;
  const disabledPlaceholder = isDrawer
    ? "You are drawing! Chat disabled"
    : hasGuessed
    ? "You guessed the word! Shh..."
    : undefined;

  return (
    <div className="flex flex-col h-full bg-white rounded shadow-md overflow-hidden border border-zinc-300">
      {/* Message List */}
      <ChatMessageList messages={messages} />

      {/* Input Form */}
      <ChatInput
        onSendMessage={onSendMessage}
        disabled={disabled}
        disabledPlaceholder={disabledPlaceholder}
      />
    </div>
  );
}
