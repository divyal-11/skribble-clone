export type TeamId = "red" | "blue" | "green" | "yellow";

export interface Player {
  id: string;
  name: string;
  score: number;
  hasGuessed: boolean;
  connected: boolean;
  teamId?: TeamId;
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

export interface ChatMessagePayload {
  senderId: string;
  senderName: string;
  text: string;
  type: "chat" | "correct" | "close" | "system" | "info" | "join" | "leave";
}


// Client -> Server events
export interface ClientToServerEvents {
  joinRoom: (payload: { roomId: string; playerName: string; teamId?: string | null; language?: string }) => void;
  leaveRoom: (payload: { roomId: string }) => void;
  startGame: (payload: { roomId: string; settings?: RoomSettings }) => void;
  updateRoomSettings: (payload: { roomId: string; settings: Partial<RoomSettings> }) => void;
  wordSelect: (payload: { roomId: string; word: string }) => void;
  draw: (payload: { roomId: string } & DrawStroke) => void;
  clearCanvas: (payload: { roomId: string }) => void;
  guess: (payload: { roomId: string; text: string }) => void;
  switchTeam: (payload: { roomId: string; teamId: TeamId }) => void;
  ping: () => void;
}

// Server -> Client events
export interface ServerToClientEvents {
  joinedRoom: (payload: {
    roomId: string;
    players: Player[];
    status: string;
    hostId: string;
    settings?: RoomSettings;
    currentDrawerId?: string;
    maskedWord?: string;
    word?: string;
  }) => void;
  roomSettingsUpdated: (payload: { settings: RoomSettings }) => void;
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
  scoreUpdate: (payload: {
    scores: Record<string, number>;
    guesserId?: string;
    teamScores?: Record<string, number>;
  }) => void;
  turnEnded: (payload: {
    word: string;
    scores: Record<string, number>;
    scoreDeltas?: Record<string, number>;
    reason?: string;
  }) => void;
  gameEnded: (payload: {
    finalScores: Record<string, number>;
    teamScores?: Record<string, number>;
    playersByTeam?: Record<string, Player[]>;
  }) => void;
  // Day 1 plumbing test
  pong: () => void;
  teamUpdated: (payload: { playerId: string; teamId: TeamId }) => void;
  teamScoresUpdate: (payload: { scores: Record<string, number> }) => void;
  roomPaused: (payload: { reason: string }) => void;
  playerListUpdate: (payload: { players: Player[] }) => void;
}

// Data attached to each socket instance
export interface SocketData {
  playerId: string;
  roomId?: string;
}

export interface RoomSettings {
  maxPlayers: number;
  drawTime: number;
  rounds: number;
  hints: number;
  wordCount: number;
  language: string;
  gameMode: string;        // "Normal" | "Team" | "Hidden" | "Combination"
  teamCount?: number;      // 2, 3, 4
  customWords: string;
  customWordsOnly: boolean;
}


