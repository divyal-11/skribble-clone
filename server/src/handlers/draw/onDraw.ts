import { Socket } from "socket.io";
import {
    ClientToServerEvents,
    ServerToClientEvents,
    SocketData,
    DrawStroke

} from "../../types/events.js"

import { addStrokeToRoom } from "../../services/strokeService.js";
import {getRoom} from "../../services/roomService.js";

type AppSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
>;

export function handleDraw(socket: AppSocket){
    const playerId = socket.data.playerId;
    

    

    socket.on("draw", async(payload)=>{
        const {roomId, ...strokeData} = payload;
        const cleanRoomId = roomId.trim().toUpperCase();

        //verify room status aand drawer identity
        const room  = await getRoom(cleanRoomId);
        if (!room || room.status !== "drawing" || room.currentDrawerId !== playerId) {
      return;
    }

        const stroke :DrawStroke = strokeData;

        //store stroke in redis
        await addStrokeToRoom(cleanRoomId,stroke);

        //broadcast stroke to other playerr in the room
        socket.to(cleanRoomId).emit("drawData",stroke);
    })
}