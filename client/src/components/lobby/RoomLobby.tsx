import { Player } from "@/types/events";
import { RoomCodeHeader } from "./RoomCodeHeader";
import { PlayerList } from "./PlayerList";
import { LobbyActions } from "./LobbyActions";

interface RoomLobbyProps {
  roomId: string;
  players: Player[];
  myPlayerId: string;
  hostId: string | null;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export function RoomLobby({
  roomId,
  players,
  myPlayerId,
  hostId,
  onStartGame,
  onLeaveRoom,
}: RoomLobbyProps) {
  const isHost = hostId === myPlayerId;
  const canStart = isHost && players.length >= 2;

  return (
    <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
      <RoomCodeHeader roomId={roomId} />

      <PlayerList
        players={players}
        myPlayerId={myPlayerId}
        hostId={hostId}
      />

      <LobbyActions
        isHost={isHost}
        canStart={canStart}
        onStartGame={onStartGame}
        onLeaveRoom={onLeaveRoom}
      />
    </div>
  );
}
