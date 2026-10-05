import { redis } from "../lib/redis.js";
import { getRoom, ROOM_TTL } from "./roomService.js";
import { getRandomWords,maskWord } from "../lib/words.js";


//retrieves count word options for the room respecting custom words and custom words only settings.
export async function getWordOptionsForRoom(
  roomId: string,
  count: number = 3
): Promise<string[]> {
  const room = await getRoom(roomId);
  const wordpackKey = `room:${roomId}:wordpack`;
  const customWords = await redis.smembers(wordpackKey);

  if (customWords.length > 0) {
    if (room?.customWordsOnly) {
      const shuffled = [...customWords].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    }
    // Combined pool
    const defaultWords = getRandomWords(count);
    const combined = Array.from(new Set([...customWords, ...defaultWords]));
    const shuffled = combined.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
  return getRandomWords(count);
}

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
