import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "@/types/events";

// Note: socket.io-client takes <ServerToClientEvents, ClientToServerEvents> (opposite order of the server)
export const socket: Socket<
    ServerToClientEvents, 
    ClientToServerEvents
    > = io(
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000",
  {
    autoConnect: false, // We connect inside React useEffect to prevent SSR connection issues
  },
);
