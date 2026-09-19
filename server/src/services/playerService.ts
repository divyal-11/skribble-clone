import { redis } from "../lib/redis.js";
import { Player } from "../types/events.js";
import { getRoom, RoomMeta, ROOM_TTL } from "./roomService.js";

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
