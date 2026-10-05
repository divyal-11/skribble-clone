import { redis } from "../lib/redis.js";
import { getRoom, ROOM_TTL } from "./roomService.js";
import { getRoomPlayers } from "./playerService.js";
import { RoomSettings } from "../types/events.js";

/**
 * Starts a game: validates host, shuffles turn order, and updates Redis
 */
export async function startGameInRoom(
  roomId: string,
  hostId: string,
  settings?: RoomSettings,
): Promise<{
  success: boolean;
  error?: string;
  turnOrder?: string[];
  currentDrawerId?: string;
  totalRounds?: number;
  drawTime?: number;
  wordCount?: number;
}> {
  const room = await getRoom(roomId);
  if (!room) {
    return { success: false, error: "Room does not exist" };
  }

  // 1. Host Authorization Check
  if (room.hostId !== hostId) {
    return { success: false, error: "Only the host can start the game" };
  }

  // 2. Minimum 2 Players Check
  const players = await getRoomPlayers(roomId);
  if (players.length < 2) {
    return { success: false, error: "Need at least 2 players to start" };
  }

  // 3. Establish Turn Order (shuffled player IDs)
  const turnOrder = players.map((p) => p.id).sort(() => 0.5 - Math.random());
  const currentDrawerId = turnOrder[0];

  // 4. Extract and normalize settings
  const totalRounds = settings?.rounds || room.totalRounds || 3;
  const drawTime = settings?.drawTime || room.drawTime || 60;
  const wordCount = settings?.wordCount || room.wordCount || 3;
  const hints = settings?.hints ?? room.hints ?? 2;
  const customWordsOnly = settings?.customWordsOnly ?? false;


  // 5. Store Custom Words in Redis Set if provided
  const wordpackKey = `room:${roomId}:wordpack`;
  await redis.del(wordpackKey);

  if (settings?.customWords && settings.customWords.trim().length > 0) {
    const parsedWords = settings.customWords
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length >= 1 && w.length <= 32);
    if (parsedWords.length > 0) {
      await redis.sadd(wordpackKey, ...parsedWords);
      await redis.expire(wordpackKey, ROOM_TTL);
      console.log(`📦 Loaded ${parsedWords.length} custom words for room ${roomId}`);
    }
  }


  // 4. Update Redis State
  const roomKey = `room:${roomId}`;
  await redis.hset(roomKey, {
    status: "choosing",
    currentRound: "1",
    totalRounds: totalRounds.toString(),
    drawTime: drawTime.toString(),
    wordCount: wordCount.toString(),
    hints: hints.toString(),
    customWordsOnly: customWordsOnly ? "true" : "false",
    turnOrder: JSON.stringify(turnOrder),
    turnIndex: "0",
    currentDrawerId: currentDrawerId,
  });
  await redis.expire(roomKey, ROOM_TTL);

  return {
    success: true,
    turnOrder,
    currentDrawerId,
    totalRounds,
    drawTime,
    wordCount,
  };
}

export async function advanceTurnInRoom(roomId:string):Promise <{
  gameOver: boolean;
  currentDrawerId?:string;
  currentRound?:number;
  totalRounds?:number;
}>{
  const roomKey = `room:${roomId}`;
  const data = await redis.hgetall(roomKey);
  if(!data || !data.turnOrder) return {gameOver: true};

  const turnOrder = JSON.parse(data.turnOrder) as string[];
  const totalRounds = parseInt(data.totalRounds || "3", 10);
  let currentRound = parseInt(data.currentRound || "1", 10);
  let turnIndex = parseInt(data.turnIndex || "0", 10) + 1;

  //if all players have had a turn in this round, advance round
  if(turnIndex >= turnOrder.length){
    turnIndex = 0;
    currentRound +=1;
  }

  //check is all rounds are complete
  if(currentRound > totalRounds){
    await redis.hset(roomKey, "status", "gameEnd");

    return { 
      gameOver: true, 
      totalRounds, 
      currentRound 
    };
  }

  const currentDrawerId = turnOrder[turnIndex];
  //save the new state
  await redis.hset(roomKey,{
    status: "choosing",
    currentRound: currentRound.toString(),
    turnIndex: turnIndex.toString(),
    currentDrawerId,
    currentWord: "",
  });

  await redis.expire(roomKey, ROOM_TTL);

  return { 
    gameOver: false, 
    currentDrawerId, 
    currentRound, 
    totalRounds 
  };
}
