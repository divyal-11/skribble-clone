import { Socket } from "socket.io";
import{
    ClientToServerEvents,
    ServerToClientEvents,
    SocketData
} from "../../types/events.js"
import { clearRoomStrokes } from "../../services/strokeService.js";
import {getRoom} from "../../services/roomService.js"

type AppSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
>;

export function handleClearCanvas(socket: AppSocket){
    const playerId = socket.data.playerId;

    socket.on("clearCanvas",async({roomId})=>{
        const cleanRoomId = roomId.trim().toUpperCase();

        // first check is only drawer can clear the canvas
        const room = await getRoom(cleanRoomId);
        if(!room ||room.status !== 'drawing' || room.currentDrawerId !==playerId){
            return; 
        }

        //wipte redis stroke history for the room
        await clearRoomStrokes(cleanRoomId);

        //emit event to clear canvas for all clients
        socket.to(cleanRoomId).emit("drawData",{
            type:"clear",
            x:0,
            y:0,
        })

    })
}