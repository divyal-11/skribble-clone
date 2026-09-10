'use client';

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [pongReceived, setPongReceived] = useState(0);

  useEffect(() => {
    // Connect to server when component mounts in browser
    socket.connect();

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onPong() {
      setPongReceived((prev) => prev + 1);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('pong', onPong);

    // Cleanup listeners when component unmounts
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('pong', onPong);
      socket.disconnect();
    };
  }, []);

  const sendPing = () => {
    socket.emit('ping');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-zinc-950 text-white font-mono">
      <h1 className="text-3xl font-bold mb-6">🎨 Skribbl Clone — Day 1</h1>

      <div className="flex items-center gap-3 mb-8 bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-full">
        <span
          className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
          }`}
        />
        <span>Status: {isConnected ? 'Connected to Server' : 'Disconnected'}</span>
      </div>

      <button
        onClick={sendPing}
        disabled={!isConnected}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white font-semibold rounded-lg shadow transition"
      >
        Send Ping 🏓
      </button>

      {pongReceived > 0 && (
        <p className="mt-6 text-emerald-400">
          ✅ Pong received from server! (Count: {pongReceived})
        </p>
      )}
    </main>
  );
}
