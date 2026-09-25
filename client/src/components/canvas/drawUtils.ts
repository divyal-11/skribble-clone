import { DrawStroke } from "@/types/events";

//convert client mouse/touch position into normalised coordinates
export function getNormalisedCoords(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
  };
}

//render a stroke on canvas  contect using normalise coords
export function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: DrawStroke,
  canvas: HTMLCanvasElement,
) {
  if (stroke.type === "clear") {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const x = stroke.x * canvas.width;
  const y = stroke.y * canvas.height;
  const prevX = (stroke.prevX ?? stroke.x) * canvas.width;
  const prevY = (stroke.prevY ?? stroke.y) * canvas.height;
  ctx.strokeStyle = stroke.color || "#ffffff";
  ctx.lineWidth = stroke.size || 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(prevX, prevY);
  ctx.lineTo(x, y);
  ctx.stroke();
}
