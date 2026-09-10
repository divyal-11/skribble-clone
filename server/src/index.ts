import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from './types/events.js';

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

io.on('connection',(socket)=>{
    console.log(`Client connected:${socket.id}`)

    socket.on('ping',()=>{
        console.log(`ping received from ${socket.id}`)
        socket.emit('pong');
    })

    socket.on('disconnect',(reason)=>{
        console.log(`Client disconneted:${socket.id},Reason: ${reason}`)
    })
})

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT,()=>{
    console.log(`Server running on port: ${PORT}`)
})