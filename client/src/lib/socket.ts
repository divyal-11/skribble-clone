import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "@/types/events";


//Get a unique ID for the current player. If the browser doesn't have one yet, create one and save it.
export function getPlayerId():string{
  if(typeof window === 'undefined') return '';

  let id= sessionStorage.getItem('skribbl_player_id');

  if(!id){
    id  = crypto.randomUUID();
    sessionStorage.setItem('skribbl_player_id', id);
  }
  return id;
}
// Note: socket.io-client takes <ServerToClientEvents, ClientToServerEvents> (opposite order of the server)
export const socket: Socket<
    ServerToClientEvents, 
    ClientToServerEvents
    > = io(
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000",
  {
    autoConnect: false, // We connect inside React useEffect to prevent SSR connection issues
    auth: (cb)=>{
      cb({playerId:getPlayerId()});
    }
  },
);
