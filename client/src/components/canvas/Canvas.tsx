import { useRef, useState } from "react";
import { CanvasHeader } from "./CanvasHeader";
import { CanvasToolbar } from "./CanvasToolbar";
import { useCanvasDrawing } from "./useCanvasDrawing";
import { WordChoosingBanner } from "../game/WordChoosingBanner";
import { TurnEndBanner } from "../game/TurnEndBanner";

import { Player } from "@/types/events";

interface CanvasProps {
  roomId: string;
  isDrawer: boolean;
  drawerName?: string;
  word?: string;
  maskedWord?: string;
  timeLeft?: number;
  isChoosing?: boolean;
  choosingDrawerName?: string;
  isRoundEnd?: boolean;
  revealedWord?: string;
  players?: Player[];
  turnScores?: Record<string, number>;
  turnEndReason?: string;
}

export function Canvas({
  roomId,
  isDrawer,
  drawerName,
  word,
  maskedWord,
  timeLeft,
  isChoosing,
  choosingDrawerName,
  isRoundEnd,
  revealedWord,
  players,
  turnScores,
  turnEndReason,
}: CanvasProps) {
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(4);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { onPointerDown, onPointerMove, onPointerUp, onClear } =
    useCanvasDrawing(canvasRef, roomId, isDrawer, color, size);

  return (
    <div className="w-full max-w-4xl space-y-3">
      {/* 1. Header with Word/Blanks & Timer */}
      <CanvasHeader
        isDrawer={isDrawer}
        drawerName={drawerName}
        word={word}
        maskedWord={maskedWord}
        timeLeft={timeLeft}
      />

      {/* 2. Responsive Canvas Board */}
      <div className="relative w-full aspect-[16/10] bg-white border-2 border-zinc-300 rounded-2xl overflow-hidden shadow-2xl">
        {isChoosing && !isDrawer && choosingDrawerName && (
          <WordChoosingBanner drawerName={choosingDrawerName} />
        )}

        {isRoundEnd && revealedWord && (
          <TurnEndBanner
            word={revealedWord}
            players={players}
            scoreDeltas={turnScores}
            reason={turnEndReason}
          />
        )}
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className={`w-full h-full touch-none bg-white ${
            isDrawer ? "cursor-crosshair" : "cursor-default"
          }`}
        />
      </div>

      {/* 3. Drawer Controls Toolbar */}
      <CanvasToolbar
        color={color}
        setColor={setColor}
        size={size}
        setSize={setSize}
        onClear={onClear}
        disabled={!isDrawer}
      />
    </div>
  );
}
