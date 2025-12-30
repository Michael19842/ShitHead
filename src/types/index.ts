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
} as const;

// Card rank display names
export const RANK_NAMES: Record<number, string> = {
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

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};
