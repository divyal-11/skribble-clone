import { redis } from "../lib/redis.js";
import { getRoom, ROOM_TTL } from "./roomService.js";
import { getRoomPlayers } from "./playerService.js";

/**
 * Starts a game: validates host, shuffles turn order, and updates Redis
 */
export async function startGameInRoom(
  roomId: string,
  hostId: string
): Promise<{
  success: boolean;
  error?: string;
  turnOrder?: string[];
  currentDrawerId?: string;
  totalRounds?: number;
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

  // 4. Update Redis State
  const roomKey = `room:${roomId}`;
  await redis.hset(roomKey, {
    status: "choosing",
    currentRound: "1",
    turnOrder: JSON.stringify(turnOrder),
    currentDrawerId: currentDrawerId,
  });
  await redis.expire(roomKey, ROOM_TTL);

  return {
    success: true,
    turnOrder,
    currentDrawerId,
    totalRounds: room.totalRounds,
  };
}
