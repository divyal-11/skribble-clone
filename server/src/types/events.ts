// Shared entities
export interface Player {
  id: string;
  name: string;
  score: number;
  hasGuessed: boolean;
  connected: boolean;
}

export interface DrawStroke {
  type: 'start' | 'line' | 'clear';
  x: number;
  y: number;
  prevX?: number;
  prevY?: number;
  color?: string;
  size?: number;
}

// Client -> Server events
export interface ClientToServerEvents {
  joinRoom: (payload: { roomId: string; playerName: string }) => void;
  leaveRoom: (payload: { roomId: string }) => void;
  startGame: (payload: { roomId: string }) => void;
  wordSelect: (payload: { roomId: string; word: string }) => void;
  draw: (payload: { roomId: string } & DrawStroke) => void;
  clearCanvas: (payload: { roomId: string }) => void;
  guess: (payload: { roomId: string; text: string }) => void;
  // Day 1 plumbing test
  ping: () => void;
}

// Server -> Client events
export interface ServerToClientEvents {
  joinedRoom: (payload: {
    roomId: string;
    players: Player[];
    status: string;
    hostId: string;
    currentDrawerId?: string;
    maskedWord?: string;
    word?: string;
  }) => void;
  playerJoined: (payload: { player: Player }) => void;
  playerLeft: (payload: { playerId: string; newHostId?: string }) => void;
  gameStarted: (payload: { turnOrder: string[]; totalRounds: number }) => void;
  chooseWord: (payload: { options: string[] }) => void;
  wordChosen: (payload: { maskedWord: string; drawerId: string; word?: string }) => void;
  drawData: (payload: DrawStroke) => void;
  canvasSync: (payload: { strokes: DrawStroke[] }) => void;
  guessResult: (payload: { playerId: string; correct: boolean; text?: string }) => void;
  scoreUpdate: (payload: { scores: Record<string, number> }) => void;
  turnEnded: (payload: { word: string; scores: Record<string, number> }) => void;
  gameEnded: (payload: { finalScores: Record<string, number> }) => void;
  // Day 1 plumbing test
  pong: () => void;
}

// Data attached to each socket instance
export interface SocketData {
  playerId: string;
  roomId?: string;
}
