import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../../types/events.js";
import { handleJoinRoom } from "./joinRoom.js";
import { handleLeaveRoom } from "./leaveRoom.js";
import { handleDisconnect } from "./disconnect.js";
import { handleSwitchTeam } from "./switchTeam.js";
import { handleUpdateSettings } from "./updateSettings.js";

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

export function registerRoomHandlers(io: AppServer, socket: AppSocket) {
  handleJoinRoom(socket);
  handleLeaveRoom(io, socket);
  handleDisconnect(io, socket);
  handleSwitchTeam(io, socket);
  handleUpdateSettings(io, socket);
}
