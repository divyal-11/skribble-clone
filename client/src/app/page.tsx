'use client';

import { useEffect, useState } from 'react';
import { getPlayerId, socket } from '@/lib/socket';
import { Player } from '@/types/events';
import { Toast, NotificationData } from '@/components/Toast';
import { JoinRoomCard } from '@/components/JoinRoomCard';
import { RoomLobby } from '@/components/RoomLobby';

export default function Home() {
  const [playerName, setPlayerName] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [notification, setNotification] = useState<NotificationData | null>(null);

  const showNotification = (message: string, type: 'join' | 'leave') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    socket.connect();

    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }

    function onJoinedRoom(data: { roomId: string; players: Player[]; status: string }) {
      setCurrentRoom(data.roomId);
      setPlayers(data.players);
    }

    function onPlayerJoined(data: { player: Player }) {
      showNotification(`${data.player.name} joined the room`, 'join');
      setPlayers((prev) => {
        if (prev.some((p) => p.id === data.player.id)) return prev;
        return [...prev, data.player];
      });
    }

    function onPlayerLeft(data: { playerId: string }) {
      setPlayers((prev) => {
        const leftPlayer = prev.find((p) => p.id === data.playerId);
        if (leftPlayer) {
          showNotification(`${leftPlayer.name} left the room`, 'leave');
        }
        return prev.filter((p) => p.id !== data.playerId);
      });
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('joinedRoom', onJoinedRoom);
    socket.on('playerJoined', onPlayerJoined);
    socket.on('playerLeft', onPlayerLeft);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('joinedRoom', onJoinedRoom);
      socket.off('playerJoined', onPlayerJoined);
      socket.off('playerLeft', onPlayerLeft);
    };
  }, []);

  const handleCreateRoom = () => {
    if (!playerName.trim()) return alert('Please enter your Name first');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    socket.emit('joinRoom', {
      roomId: code,
      playerName: playerName.trim(),
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return alert('Please enter your Name first');
    if (!roomInput.trim()) return alert('Please enter room code');

    socket.emit('joinRoom', {
      roomId: roomInput.trim().toUpperCase(),
      playerName: playerName.trim(),
    });
  };

  const handleLeaveRoom = () => {
    if (currentRoom) {
      socket.emit('leaveRoom', { roomId: currentRoom });
      setCurrentRoom(null);
      setPlayers([]);
    }
  };

  const myPlayerId = typeof window !== 'undefined' ? getPlayerId() : '';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 text-white font-sans">
      {/* Floating Toast Notification */}
      {notification && <Toast notification={notification} />}

      {/* Connection Indicator */}
      <div className="flex items-center gap-2 mb-8 bg-zinc-900 border border-zinc-800 px-4 py-1.5 rounded-full text-sm">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
          }`}
        />
        <span className="text-zinc-400 font-mono">
          {isConnected ? 'Server Connected' : 'Connecting to Server...'}
        </span>
      </div>

      {!currentRoom ? (
        /* SCREEN 1: Enter Name & Create / Join Room */
        <JoinRoomCard
          playerName={playerName}
          setPlayerName={setPlayerName}
          roomInput={roomInput}
          setRoomInput={setRoomInput}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          isConnected={isConnected}
        />
      ) : (
        /* SCREEN 2: Room Lobby */
        <RoomLobby
          roomId={currentRoom}
          players={players}
          myPlayerId={myPlayerId}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </main>
  );
}
