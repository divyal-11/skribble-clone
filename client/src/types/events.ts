export interface Player {
  id: string;
  name: string;
  score: number;
  hasGuessed: boolean;
  connected: boolean;
}

export interface DrawStroke {
  type: "start" | "line" | "clear";
  x: number;
  y: number;
  prevX?: number;
  prevY?: number;
  color?: string;
  size?: number;
}

export interface ChatMessagePayload {
  senderId: string;
  senderName: string;
  text: string;
  type: "chat" | "correct" | "close" | "system";
}


export interface ClientToServerEvents {
  joinRoom: (payload: { roomId: string; playerName: string }) => void;
  leaveRoom: (payload: { roomId: string }) => void;
  startGame: (payload: { roomId: string; settings?: RoomSettings }) => void;
  wordSelect: (payload: { roomId: string; word: string }) => void;
  draw: (payload: { roomId: string } & DrawStroke) => void;
  clearCanvas: (payload: { roomId: string }) => void;
  guess: (payload: { roomId: string; text: string }) => void;
  ping: () => void;
}

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
  gameStarted: (payload: { turnOrder: string[]; totalRounds: number; currentDrawerId: string }) => void;
  choosingWord: (payload: { drawerId: string; drawerName: string }) => void;
  chooseWord: (payload: { options: string[] }) => void;
  wordChosen: (payload: {
    maskedWord: string;
    drawerId: string;
    word?: string;
    roundEndsAt: number;
    duration: number;
  }) => void;
  drawData: (payload: DrawStroke) => void;
  canvasSync: (payload: { strokes: DrawStroke[] }) => void;
  chatMessage: (payload: ChatMessagePayload) => void;
  guessResult: (payload: {
    playerId: string;
    correct: boolean;
    text?: string;
    word?: string;
  }) => void;
  hintRevealed: (payload: { maskedWord: string }) => void;
  scoreUpdate: (payload: { scores: Record<string, number> }) => void;
  turnEnded: (payload: {
    word: string;
    scores: Record<string, number>;
  }) => void;
  gameEnded: (payload: { finalScores: Record<string, number> }) => void;
  pong: () => void;
}

export interface RoomSettings {
  maxPlayers: number;
  drawTime: number;        // 30, 40, 50, 60, 70, 80, 90, 100, 120
  rounds: number;          // 2, 3, 4, 5, 6, 8, 10
  hints: number;           // 0, 1, 2, 3, 4, 5
  wordCount: number;       // 3, 4, 5
  language: string;        // "English"
  gameMode: string;        // "Normal" | "Hidden" | "Combination"
  customWords: string;     // comma-separated words
  customWordsOnly: boolean;
}

