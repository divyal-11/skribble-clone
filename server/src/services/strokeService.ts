import {redis} from '../lib/redis.js';
import {DrawStroke} from '../types/events.js';
import {ROOM_TTL} from './roomService.js';

//append a stroke to the Rooms drawing history in redis
export async function addStrokeToRoom(
    roomId: string,
    stroke:DrawStroke
):Promise<void>{
    const strokesKey = `room:${roomId}:strokes`;
    await redis.rpush(strokesKey,JSON.stringify(stroke));
    await redis.expire(strokesKey,ROOM_TTL)//Keep the stroke list for 2 hours. After that, Redis can automatically delete it.
}

//retrieve all strokes for  a room
export async function getRoomStrokes(
    roomId:string
):Promise<DrawStroke[]>{
    const strokesKey = `room:${roomId}:strokes`
    const rawStrokes = await redis.lrange(strokesKey,0,-1);
    if(!rawStrokes || rawStrokes.length === 0){
        return [];
    }
    return rawStrokes.map((s) => JSON.parse(s) as DrawStroke);
}


//clear drawing history(called when user clears canvas or when turn ends)
export async function clearRoomStrokes(roomId:string):Promise<void>{
    const strokesKey = `room:${roomId}:strokes`;
    await redis.del(strokesKey);
}