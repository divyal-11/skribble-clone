import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../types/events.js";
import { handleDraw } from "./onDraw.js";
import { handleClearCanvas } from "./onClearCanvas.js";

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

export function registerDrawHandlers(_io: AppServer, socket: AppSocket) {
  handleDraw(socket);
  handleClearCanvas(socket);
}
