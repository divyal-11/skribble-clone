import { redis } from "../lib/redis.js";
import { getRoom, ROOM_TTL } from "./roomService.js";
import { maskWord } from "../lib/words.js";

/**
 * Validates active drawer and transitions room to 'drawing'
 */
export async function selectWordInRoom(
  roomId: string,
  drawerId: string,
  word: string
): Promise<{
  success: boolean;
  error?: string;
  word?: string;
  maskedWord?: string;
}> {
  const room = await getRoom(roomId);
  if (!room) {
    return { success: false, error: "Room not found" };
  }

  if (room.currentDrawerId !== drawerId) {
    return { success: false, error: "Only the active drawer can pick a word" };
  }

  const cleanWord = word.trim().toLowerCase();
  const masked = maskWord(cleanWord);
  const roomKey = `room:${roomId}`;

  await redis.hset(roomKey, {
    status: "drawing",
    currentWord: cleanWord,
  });
  await redis.expire(roomKey, ROOM_TTL);

  return {
    success: true,
    word: cleanWord,
    maskedWord: masked,
  };
}
