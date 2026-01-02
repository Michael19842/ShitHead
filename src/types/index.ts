export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export interface Card {
  suit: Suit;
  rank: number; // 2-14 (11=J, 12=Q, 13=K, 14=A)
  id: string;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  faceUp: Card[];
  faceDown: Card[];
  isAI: boolean;
  isOut: boolean; // Player has finished (no cards left)
}

export enum GamePhase {
  SETUP = 'SETUP',
  SWAPPING = 'SWAPPING', // Initial phase where players can swap hand/faceUp cards
  PLAYING = 'PLAYING',
  ENDED = 'ENDED'
}

export enum PlayerPhase {
  HAND = 'HAND',
  FACE_UP = 'FACE_UP',
  FACE_DOWN = 'FACE_DOWN'
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  discardPile: Card[];
  burnPile: Card[];
  phase: GamePhase;
  deckCount: number; // 1 or 2 decks
  lastAction: GameAction | null;
  playDirection: 1 | -1; // 1 = clockwise, -1 = counter-clockwise
}

export type GameAction =
  | { type: 'PLAY_CARDS'; playerId: string; cards: Card[] }
  | { type: 'PICKUP_PILE'; playerId: string }
  | { type: 'BURN'; reason: 'ten' | 'four_of_a_kind' }
  | { type: 'PLAYER_OUT'; playerId: string }
  | { type: 'GAME_OVER'; loserId: string };

export interface MoveResult {
  success: boolean;
  message?: string;
  burned?: boolean;
  playerOut?: boolean;
  gameOver?: boolean;
}

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface GameSettings {
  playerCount: number;
  humanPlayerCount: number;
  aiDifficulty: AIDifficulty;
  playerNames: string[];
  soundEnabled: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
}

// Special card ranks
export const SPECIAL_CARDS = {
  TWO: 2,    // Reset - can play on anything
  THREE: 3,  // Glass - transparent, look through
  SEVEN: 7,  // Cap - next must be 7 or lower
  TEN: 10,   // Burn - removes pile from game
  JACK: 11,  // Reverse - changes play direction
} as const;

// Card rank display names (English)
export const RANK_NAMES_EN: Record<number, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

// Card rank display names (Dutch)
export const RANK_NAMES_NL: Record<number, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'B',  // Boer
  12: 'V',  // Vrouw
  13: 'H',  // Heer
  14: 'A',  // Aas
};

// Default to English for backwards compatibility
export const RANK_NAMES = RANK_NAMES_EN;

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

// ==================== ONLINE MULTIPLAYER TYPES ====================

// Emoji reactions available in online games
export const EMOJI_REACTIONS = ['👍', '😂', '😡', '🔥', '💩', '🎉'] as const;
export type EmojiReaction = typeof EMOJI_REACTIONS[number];

// Player connection status
export type ConnectionStatus = 'connected' | 'disconnected';

// Lobby types
export type LobbyType = 'random' | 'private';
export type LobbyStatus = 'waiting' | 'starting' | 'in_game' | 'closed';

// Online game status
export type OnlineGameStatus = 'swapping' | 'playing' | 'ended';

// Player in a lobby
export interface LobbyPlayer {
  playerId: string;
  displayName: string;
  joinedAt: Date;
  ready: boolean;
  isHost: boolean;
}

// Firestore player profile
export interface OnlinePlayer {
  id: string;
  deviceId: string;
  displayName: string;
  createdAt: Date;
  lastSeen: Date;
  currentGameId: string | null;
  currentLobbyId: string | null;
  stats: PlayerStats;
}

// Player statistics
export interface PlayerStats {
  gamesPlayed: number;
  gamesLost: number;
  totalTimeouts: number;
}

// Lobby document
export interface Lobby {
  id: string;
  hostPlayerId: string;
  type: LobbyType;
  code: string | null;
  targetPlayerCount: number;
  status: LobbyStatus;
  createdAt: Date;
  updatedAt: Date;
  gameId: string | null;
  players: Record<string, LobbyPlayer>;
}

// Online player state during game
export interface OnlineGamePlayer {
  displayName: string;
  hand: Card[];
  faceUp: Card[];
  faceDown: Card[];
  isOut: boolean;
  connectionStatus: ConnectionStatus;
  lastPingAt: Date;
  timeoutsThisGame: number;
  swapConfirmed: boolean;
}

// Turn state
export interface TurnState {
  playerId: string;
  startedAt: Date;
  expiresAt: Date;
  phase: 'swap' | 'play';
}

// Swap phase state
export interface SwapPhaseState {
  startedAt: Date;
  expiresAt: Date;
  confirmedPlayers: string[];
}

// Emoji reaction in game
export interface GameReaction {
  playerId: string;
  emoji: EmojiReaction;
  timestamp: Date;
}

// Online game document
export interface OnlineGame {
  id: string;
  lobbyId: string;
  status: OnlineGameStatus;
  createdAt: Date;
  updatedAt: Date;
  playerOrder: string[];
  players: Record<string, OnlineGamePlayer>;
  deckCount: number;
  deckEmpty: boolean;
  discardPile: Card[];
  burnPile: Card[];
  currentPlayerIndex: number;
  turnState: TurnState;
  swapPhase: SwapPhaseState | null;
  loserId: string | null;
  reactions: GameReaction[];
}

// Ban document
export interface PlayerBan {
  playerId: string;
  reason: 'afk_timeout';
  bannedAt: Date;
  expiresAt: Date;
  gameId: string;
}

// Online move types
export type OnlineMove =
  | { type: 'play'; cards: Card[] }
  | { type: 'pickup' }
  | { type: 'blind'; blindIndex: number };

// Auth state
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  playerId: string | null;
  playerName: string | null;
  error: string | null;
}
