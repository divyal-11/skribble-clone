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
): Promise<{ room: RoomMeta; players: Player[],isReconnect:boolean }> {
  const roomKey = `room:${roomId}`;
  const playersKey = `room:${roomId}:players`;

  let room = await getRoom(roomId);

  if (!room) {
    const newRoom:RoomMeta = {
      hostId: player.id,
      status: "waiting",
      currentRound: 1,
      totalRounds: 3,
      drawTime: 60,
      wordCount: 3,
      hints: 2,
      customWordsOnly: false,
    };
    await redis.hset(roomKey, {
      hostId: newRoom.hostId,
      status: newRoom.status,
      currentRound: newRoom.currentRound.toString(),
      totalRounds: newRoom.totalRounds.toString(),
      drawTime: newRoom.drawTime.toString(),
      wordCount: newRoom.wordCount.toString(),
      hints: newRoom.hints.toString(),
      customWordsOnly: "false",
    });
    room = newRoom;
  }
  
  //check if player already exists in the room(reconnection)
  const existingPlayerRaw = await redis.hget(playersKey, player.id)
  let isReconnect = false;
  let finalPlayer = player;

  if(existingPlayerRaw){
    isReconnect = true;
    const existing = JSON.parse(existingPlayerRaw) as Player;
    //preserve existing score and guess state
    finalPlayer = {
      ...existing,
      connected: true,
      name: player.name || existing.name,
    }
    console.log(`🔄 Preserved existing score (${existing.score} pts) for reconnecting player ${player.id}`);    
  }

  await redis.hset(playersKey, player.id, JSON.stringify(finalPlayer));
  await redis.expire(roomKey, ROOM_TTL);
  await redis.expire(playersKey, ROOM_TTL);

  const players = await getRoomPlayers(roomId);
  return { room, players,isReconnect };
}

export async function setPlayerConnectionStatus(
  roomId: string,
  playerId: string,
  connected: boolean
): Promise<Player | null>{
  const playersKey = `room:${roomId}:players`;
  const playerRaw = await redis.hget(playersKey,playerId);
  if(!playerRaw) return null;

  const player = JSON.parse(playerRaw) as Player;
  player.connected = connected;
  await redis.hset(playersKey,playerId,JSON.stringify(player));

  return player;
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

//update redis and build the latest scoreboard for all players
export async function updatePlayerScore(
  roomId: string,
  playerId: string,
  addedScore: number
): Promise<{ players: Player[]; updatedScores: Record<string, number> }> {
  const playersKey = `room:${roomId}:players`;
  const playerRaw = await redis.hget(playersKey, playerId);
  if (playerRaw) {
    const player = JSON.parse(playerRaw) as Player;
    player.score += addedScore;
    player.hasGuessed = true;
    await redis.hset(playersKey, playerId, JSON.stringify(player));
  }

  const players = await getRoomPlayers(roomId);
  const updatedScores: Record<string, number> = {};
  players.forEach((p) => {
    updatedScores[p.id] = p.score;
  });

  return { players, updatedScores };
}


// resets hasguessed to false for  all players in the room for the new round
export async function resetPlayerGuessed(roomId:string):Promise<Player[]>{
  const players = await getRoomPlayers(roomId);
  const playerskey = `room:${roomId}:players`;

  for(const player of players){
    player.hasGuessed = false;
    await redis.hset(playerskey,player.id,JSON.stringify(player));
  }
  return players;
}

