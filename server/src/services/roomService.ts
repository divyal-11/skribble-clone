import { redis } from "../lib/redis.js";

export const ROOM_TTL = 60 * 60 * 2; // 2 hours

export interface RoomMeta {
  hostId: string;
  status: "waiting" | "choosing" | "drawing" | "roundEnd" | "gameEnd";
  currentRound: number;
  totalRounds: number;
  drawTime: number;
  wordCount: number;
  hints: number;
  customWordsOnly: boolean;
  turnOrder?: string[];
  currentDrawerId?: string;
  currentWord?: string;
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function getRoom(roomId: string): Promise<RoomMeta | null> {
  const data = await redis.hgetall(`room:${roomId}`);
  if (!data || Object.keys(data).length === 0) return null;

  return {
    hostId: data.hostId,
    status: data.status as RoomMeta["status"],
    currentRound: parseInt(data.currentRound || "1", 10),
    totalRounds: parseInt(data.totalRounds || "3", 10),
    drawTime: parseInt(data.drawTime || "60", 10),
    wordCount: parseInt(data.wordCount || "3", 10),
    hints: parseInt(data.hints || "2", 10),
    customWordsOnly: data.customWordsOnly === "true",
    turnOrder: data.turnOrder ? JSON.parse(data.turnOrder) : undefined,
    currentDrawerId: data.currentDrawerId || undefined,
    currentWord: data.currentWord || undefined,
  };
}
