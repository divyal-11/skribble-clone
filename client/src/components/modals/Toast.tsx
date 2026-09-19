import { UserPlus, UserMinus } from "lucide-react";

export interface NotificationData {
  message: string;
  type: "join" | "leave";
}

interface ToastProps {
  notification: NotificationData;
}

export function Toast({ notification }: ToastProps) {
  return (
    <div className="fixed top-6 z-50 bg-zinc-800/95 backdrop-blur border border-zinc-700 text-zinc-200 text-sm px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
      {notification.type === "join" ? (
        <UserPlus className="w-4 h-4 text-emerald-400" />
      ) : (
        <UserMinus className="w-4 h-4 text-rose-400" />
      )}
      <span>{notification.message}</span>
    </div>
  );
}
