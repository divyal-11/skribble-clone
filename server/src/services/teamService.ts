import { redis } from "../lib/redis.js";
import { Player, TeamId } from "../types/events.js";
import { getRoomPlayers } from "./playerService.js";
import { getRoom, ROOM_TTL } from "./roomService.js";

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
 * Auto-balances players across active teams without overwriting existing assignments.
 * - The room host is placed in "blue" team by default if unassigned.
 * - Players who joined via a specific team link (or switched teams) KEEP their chosen team!
 * - Unassigned players are distributed to the least-populated active teams.
 */
export async function autoBalanceTeams(
  roomId: string,
  teamCount: number = 2
): Promise<Player[]> {
  const room = await getRoom(roomId);
  const players = await getRoomPlayers(roomId);
  const playersKey = `room:${roomId}:players`;

  // Start with active teams slice based on requested count (2..4)
  const activeTeams: TeamId[] = [...AVAILABLE_TEAMS.slice(0, Math.min(Math.max(teamCount, 2), 4))];

  // If any player already joined with a team beyond the slice (e.g. green or yellow via invite link),
  // make sure that team is included in activeTeams!
  players.forEach((p) => {
    if (p.teamId && AVAILABLE_TEAMS.includes(p.teamId) && !activeTeams.includes(p.teamId)) {
      activeTeams.push(p.teamId);
    }
  });

  const teamCounts: Record<string, number> = {};
  activeTeams.forEach((t) => {
    teamCounts[t] = 0;
  });

  const updatedPlayers: Player[] = [];

  // Pass 1: Ensure room host is in "blue" team if unassigned, and keep all valid existing teams
  for (const player of players) {
    if (room && player.id === room.hostId && !player.teamId) {
      player.teamId = "blue";
    }

    if (player.teamId && activeTeams.includes(player.teamId)) {
      teamCounts[player.teamId] = (teamCounts[player.teamId] || 0) + 1;
      await redis.hset(playersKey, player.id, JSON.stringify(player));
      updatedPlayers.push(player);
    }
  }

  // Pass 2: Assign any unassigned players to the active team with the fewest members
  for (const player of players) {
    if (!player.teamId || !activeTeams.includes(player.teamId)) {
      let minTeam = activeTeams[0];
      let minCount = teamCounts[minTeam] ?? 0;
      for (const t of activeTeams) {
        const count = teamCounts[t] ?? 0;
        if (count < minCount) {
          minCount = count;
          minTeam = t;
        }
      }
      player.teamId = minTeam;
      teamCounts[minTeam] = (teamCounts[minTeam] || 0) + 1;
      await redis.hset(playersKey, player.id, JSON.stringify(player));
      updatedPlayers.push(player);
    }
  }

  await redis.expire(playersKey, ROOM_TTL);
  return updatedPlayers;
}

/**
 * Returns aggregate score mapped by teamId, initializing active teams
 */
export async function getTeamScores(roomId: string): Promise<Record<string, number>> {
  const room = await getRoom(roomId);
  const players = await getRoomPlayers(roomId);
  const scores: Record<string, number> = {};

  const activeCount = room?.teamCount || 2;
  const activeTeams = AVAILABLE_TEAMS.slice(0, Math.min(Math.max(activeCount, 2), 4));
  activeTeams.forEach((t) => {
    scores[t] = 0;
  });

  players.forEach((p) => {
    if (p.teamId) {
      scores[p.teamId] = (scores[p.teamId] || 0) + (p.score || 0);
    }
  });

  return scores;
}
