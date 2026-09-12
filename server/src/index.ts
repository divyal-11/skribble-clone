import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { redis } from './lib/redis.js';
import cors from 'cors';
import dotenv from 'dotenv';
import {addPlayerToRoom,removePlayerFromRoom,generateRoomCode} from './lib/roomManager.js'
import { ClientToServerEvents, ServerToClientEvents, SocketData, Player } from './types/events.js';


dotenv.config();

const app = express()
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string,never>,
    SocketData
>(httpServer,{
    cors:{
        origin:"*",
        methods: ['GET','POST']
    }
})


app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/create-room',(_req,res)=>{
    const roomId = generateRoomCode();
    res.json({roomId})
})

io.on('connection',(socket)=>{
    const playerId = (socket.handshake.auth?.playerId as string) || socket.id;
    socket.data.playerId = playerId;


    console.log(`Connected: socket_id=${socket.id} | player_id=${playerId}`);
    

    socket.on('joinRoom',async({roomId,playerName})=>{
        const cleanRoomId = roomId.trim().toUpperCase();
        const cleanPlayerName = playerName.trim() || 'Anonymous';

        const player:Player = {
            id:playerId,
            name:cleanPlayerName,
            score:0,
            hasGuessed:false,
            connected:true,
        }

        const {room,players} = await addPlayerToRoom(cleanRoomId,player);

        socket.join(cleanRoomId);
        socket.data.roomId = cleanRoomId;

        console.log(`👤 ${player.name} (${player.id}) joined room ${cleanRoomId}`);

        socket.emit('joinedRoom', {
            roomId: cleanRoomId,
            players,
            status: room.status,
        });

        socket.to(cleanRoomId).emit('playerJoined', { player });
    })

      // 2. Handle Disconnect
  socket.on('disconnect', async (reason) => {
    const currentRoomId = socket.data.roomId;
    console.log(`❌ Disconnected: socket=${socket.id} (Reason: ${reason})`);
    if (currentRoomId) {
      const { remainingPlayers, newHostId } = await removePlayerFromRoom(currentRoomId, playerId);
      
      // Notify remaining players in the room
      socket.to(currentRoomId).emit('playerLeft', { playerId });
      if (newHostId) {
        console.log(`👑 New host for room ${currentRoomId}: ${newHostId}`);
      }
    }
  });
})

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT,async()=>{
    console.log(`Server running on port: ${PORT}`)

    try{
        const pong = await redis.ping()
        console.log(`Redis is ready and responding: ${pong}`)
    }catch(err){
        console.error('Failed to connect to redis')
    }
})