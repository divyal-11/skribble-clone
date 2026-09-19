import React from "react";
import { Plus } from "lucide-react";

interface CreateRoomButtonProps {
  onClick: () => void;
  disabled: boolean;
}

export function CreateRoomButton({ onClick, disabled }: CreateRoomButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2"
    >
      <Plus className="w-4 h-4" />
      <span>Create New Room</span>
    </button>
  );
}
