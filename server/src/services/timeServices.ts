import { Server } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types/events.js";
import { getRoom } from "./roomService.js";
import { getRoomPlayers, resetPlayerGuessed } from "./playerService.js";
import { advanceTurnInRoom } from "./turnService.js";
import { clearRoomStrokes } from "./strokeService.js";
import { getRandomWords } from "../lib/words.js";

type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;


interface ActiveTimer {
  intervalId: NodeJS.Timeout;
  endsAt: number;
  duration: number;
}

const activeTimers = new Map<string, ActiveTimer>();

//returns remaining secs on the clock for a room
export function getRemainingTime(roomId: string):number{
    const timer = activeTimers.get(roomId);
    if(!timer) return 0;
    return Math.max(0, Math.round((timer.endsAt - Date.now()) / 1000));
}

//stops and clears any runnig timer for a room
export function stopTurnTimer(roomId: string): void{
    const timer = activeTimers.get(roomId);
    if(timer){
        clearInterval(timer.intervalId);
        activeTimers.delete(roomId);
    }
}

//starts the round countdown timer(ticks every sec)
export function startTurnTimer(
    io: AppServer,
    roomId:string,
    durationSeconds:number = 60,
    
):void {
    stopTurnTimer(roomId);//clear existing timer

    const endsAt = Date.now() + durationSeconds * 1000;

    const intervalId = setInterval(async()=>{
        const remaining = Math.max(0, Math.round((endsAt - Date.now())/1000));

        if(remaining <= 0){
            stopTurnTimer(roomId);
            //await handleTurnEnd(io, roomId);
        }
    },1000);

    activeTimers.set(roomId,{
        intervalId,
        endsAt,
        duration: durationSeconds,
    });

  console.log(`⏱️ Turn timer started for room ${roomId}: ${durationSeconds}s`);
}


    
