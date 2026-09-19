import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../types/events.js";
import { handleStartGame } from "./startGame.js";
import { handleWordSelect } from "./wordSelect.js";

type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export function registerGameHandlers(io: AppServer, socket: AppSocket) {
  handleStartGame(io, socket);
  handleWordSelect(socket);
}
