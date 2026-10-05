import { redis } from "../lib/redis.js";
import { Player, TeamId } from "../types/events.js";
import { getRoomPlayers } from "./playerService.js";
import { ROOM_TTL } from "./roomService.js";

export const AVAILABLE_TEAMS: TeamId[] = ["red", "blue", "green", "yellow"];

/**
 * Assigns or switches a player's team in Redis
 */
export async function setPlayerTeam(
  roomId: string,
  playerId: string,
  teamId: TeamId
): Promise<Player | null> {
  const playersKey = `room:${roomId}:players`;
  const raw = await redis.hget(playersKey, playerId);
  if (!raw) return null;

  const player = JSON.parse(raw) as Player;
  player.teamId = teamId;

  await redis.hset(playersKey, playerId, JSON.stringify(player));
  await redis.expire(playersKey, ROOM_TTL);

  return player;
}

/**
 * Auto-balances players across active teams (2, 3, or 4 teams)
 */
export async function autoBalanceTeams(
  roomId: string,
  teamCount: number = 2
): Promise<Player[]> {
  const players = await getRoomPlayers(roomId);
  const playersKey = `room:${roomId}:players`;
  const activeTeams = AVAILABLE_TEAMS.slice(0, Math.min(Math.max(teamCount, 2), 4));

  // Shuffle players and assign round-robin
  const shuffled = [...players].sort(() => 0.5 - Math.random());
  const updatedPlayers: Player[] = [];

  for (let i = 0; i < shuffled.length; i++) {
    const teamId = activeTeams[i % activeTeams.length];
    shuffled[i].teamId = teamId;
    await redis.hset(playersKey, shuffled[i].id, JSON.stringify(shuffled[i]));
    updatedPlayers.push(shuffled[i]);
  }

  await redis.expire(playersKey, ROOM_TTL);
  return updatedPlayers;
}

/**
 * Returns aggregate score mapped by teamId
 */
export async function getTeamScores(roomId: string): Promise<Record<string, number>> {
  const players = await getRoomPlayers(roomId);
  const scores: Record<string, number> = {};

  players.forEach((p) => {
    if (p.teamId) {
      scores[p.teamId] = (scores[p.teamId] || 0) + p.score;
    }
  });

  return scores;
}
