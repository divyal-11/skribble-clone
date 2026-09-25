import { useRef, useEffect } from "react";
import { socket } from "@/lib/socket";
import { DrawStroke } from "@/types/events";
import { getNormalisedCoords, renderStroke } from "./drawUtils";

export function useCanvasDrawing(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  roomId: string,
  isDrawer: boolean,
  color: string,
  size: number
) {
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Listen for real-time strokes and canvasSync from server
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const onDrawData = (stroke: DrawStroke) => renderStroke(ctx, stroke, canvas);
    const onCanvasSync = ({ strokes }: { strokes: DrawStroke[] }) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      strokes.forEach((s) => renderStroke(ctx, s, canvas));
    };

    socket.on("drawData", onDrawData);
    socket.on("canvasSync", onCanvasSync);

    return () => {
      socket.off("drawData", onDrawData);
      socket.off("canvasSync", onCanvasSync);
    };
  }, [canvasRef]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !canvasRef.current) return;
    const coords = getNormalisedCoords(e.clientX, e.clientY, canvasRef.current);
    lastPointRef.current = coords;

    const stroke: DrawStroke = { type: "start", ...coords, color, size };
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) renderStroke(ctx, stroke, canvasRef.current);
    socket.emit("draw", { roomId, ...stroke });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !lastPointRef.current || !canvasRef.current) return;
    const coords = getNormalisedCoords(e.clientX, e.clientY, canvasRef.current);

    const stroke: DrawStroke = {
      type: "line",
      ...coords,
      prevX: lastPointRef.current.x,
      prevY: lastPointRef.current.y,
      color,
      size,
    };

    lastPointRef.current = coords;
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) renderStroke(ctx, stroke, canvasRef.current);
    socket.emit("draw", { roomId, ...stroke });
  };

  const onPointerUp = () => {
    lastPointRef.current = null;
  };

  const onClear = () => {
    if (!isDrawer || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    socket.emit("clearCanvas", { roomId });
  };

  return { onPointerDown, onPointerMove, onPointerUp, onClear };
}
