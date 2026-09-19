import { redis } from "../lib/redis.js";
import { Player } from "../types/events.js";

export const ROOM_TTL = 60 * 60 * 2; // 2 hours

export interface RoomMeta {
  hostId: string;
  status: "waiting" | "choosing" | "drawing" | "roundEnd" | "gameEnd";
  currentRound: number;
  totalRounds: number;
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
    turnOrder: data.turnOrder ? JSON.parse(data.turnOrder) : undefined,
    currentDrawerId: data.currentDrawerId || undefined,
    currentWord: data.currentWord || undefined,
  };
}

export async function getRoomPlayers(roomId: string): Promise<Player[]> {
  const playersRaw = await redis.hgetall(`room:${roomId}:players`);
  if (!playersRaw) return [];
  return Object.values(playersRaw).map((p) => JSON.parse(p) as Player);
}

export async function addPlayerToRoom(
  roomId: string,
  player: Player
): Promise<{ room: RoomMeta; players: Player[] }> {
  const roomKey = `room:${roomId}`;
  const playersKey = `room:${roomId}:players`;

  let room = await getRoom(roomId);

  if (!room) {
    room = {
      hostId: player.id,
      status: "waiting",
      currentRound: 1,
      totalRounds: 3,
    };
    await redis.hset(roomKey, {
      hostId: room.hostId,
      status: room.status,
      currentRound: room.currentRound.toString(),
      totalRounds: room.totalRounds.toString(),
    });
  }

  await redis.hset(playersKey, player.id, JSON.stringify(player));
  await redis.expire(roomKey, ROOM_TTL);
  await redis.expire(playersKey, ROOM_TTL);

  const players = await getRoomPlayers(roomId);
  return { room, players };
}

export async function removePlayerFromRoom(
  roomId: string,
  playerId: string
): Promise<{ remainingPlayers: Player[]; newHostId?: string }> {
  const roomKey = `room:${roomId}`;
  const playersKey = `room:${roomId}:players`;

  await redis.hdel(playersKey, playerId);
  const remainingPlayers = await getRoomPlayers(roomId);

  if (remainingPlayers.length === 0) {
    await redis.del(roomKey);
    await redis.del(playersKey);
    return { remainingPlayers: [] };
  }

  const room = await getRoom(roomId);
  let newHostId: string | undefined;

  if (room && room.hostId === playerId && remainingPlayers.length > 0) {
    newHostId = remainingPlayers[0].id;
    await redis.hset(roomKey, "hostId", newHostId);
  }

  return { remainingPlayers, newHostId };
}
