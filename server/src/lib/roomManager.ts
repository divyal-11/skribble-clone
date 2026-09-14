import { redis } from "./redis.js";
import { Player } from "../types/events.js";

const ROOM_TTL = 60 * 60 * 2;

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface RoomMeta {
  hostId: string;
  status: "waiting" | "choosing" | "drawing" | "roundEnd" | "gameEnd";
  currentRound: number;
  totalRounds: number;
  turnOrder?: string[];
  currentDrawerId?:string;
  currentWord?:string;
}

export async function getRoom(roomId: string): Promise<RoomMeta | null> {
  const data = await redis.hgetall(`room:${roomId}`);
  if (!data || Object.keys(data).length === 0) {
    return null;
  }
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
  player: Player,
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
  // Save/update player in the room's player hash
  await redis.hset(playersKey, player.id, JSON.stringify(player));
  // Refresh TTLs on activity
  await redis.expire(roomKey, ROOM_TTL);
  await redis.expire(playersKey, ROOM_TTL);
  const players = await getRoomPlayers(roomId);
  return { room, players };
}

export async function removePlayerFromRoom(
    roomId: string,
    playerId: string
): Promise<{remainingPlayers: Player[];newHostId?:string}>{
    const roomKey = `room:${roomId}`;
    const playersKey = `room:${roomId}:players`;

    await redis.hdel(playersKey,playerId)

    const remainingPlayers = await getRoomPlayers(roomId)


    if(remainingPlayers.length === 0){
        //Delete room if no one is left
        await redis.del(roomKey)
        await redis.del(playersKey)
        return {remainingPlayers:[]}
    }
    
    //if the host left, select new host
    const room = await getRoom(roomId);
    let newHostId: string | undefined

    if(room && room.hostId===playerId && remainingPlayers.length > 0){
        newHostId = remainingPlayers[0].id;
        await redis.hset(roomKey,'hostId',newHostId);
        
    }
    return {remainingPlayers,newHostId};
    
}

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


