import type { Card, Suit, Player } from '@/types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 11=J, 12=Q, 13=K, 14=A

/**
 * Creates a standard 52-card deck
 * @param deckNumber Optional deck identifier for multi-deck games
 */
export function createDeck(deckNumber = 0): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}-${deckNumber}-${Math.random().toString(36).substr(2, 9)}`
      });
    }
  }

  return deck;
}

/**
 * Creates multiple decks combined
 * @param numDecks Number of decks to create (1 or 2)
 */
export function createMultiDeck(numDecks: number): Card[] {
  const deck: Card[] = [];

  for (let i = 0; i < numDecks; i++) {
    deck.push(...createDeck(i));
  }

  return deck;
}

/**
 * Fisher-Yates shuffle algorithm
 * @param deck The deck to shuffle (mutates in place and returns)
 */
export function shuffleDeck(deck: Card[]): Card[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Deal cards to players
 * Each player gets: 4 face-down, 4 face-up, 4 hand cards
 * @param deck The shuffled deck to deal from
 * @param playerCount Number of players
 * @param playerNames Names of players
 * @param humanCount Number of human players (rest are AI)
 */
export function dealCards(
  deck: Card[],
  playerCount: number,
  playerNames: string[],
  humanCount: number
): { players: Player[]; remainingDeck: Card[] } {
  const players: Player[] = [];
  const cardsPerPlayer = 12; // 4 + 4 + 4

  // Create players
  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: `player-${i}`,
      name: playerNames[i] || `Speler ${i + 1}`,
      hand: [],
      faceUp: [],
      faceDown: [],
      isAI: i >= humanCount,
      isOut: false
    });
  }

  // Deal face-down cards (4 per player)
  for (let i = 0; i < 4; i++) {
    for (const player of players) {
      const card = deck.pop();
      if (card) player.faceDown.push(card);
    }
  }

  // Deal face-up cards (4 per player)
  for (let i = 0; i < 4; i++) {
    for (const player of players) {
      const card = deck.pop();
      if (card) player.faceUp.push(card);
    }
  }

  // Deal hand cards (4 per player)
  for (let i = 0; i < 4; i++) {
    for (const player of players) {
      const card = deck.pop();
      if (card) player.hand.push(card);
    }
  }

  return {
    players,
    remainingDeck: deck
  };
}

/**
 * Calculate how many decks are needed based on player count
 * 2-4 players = 1 deck, 5-8 players = 2 decks
 */
export function getRequiredDecks(playerCount: number): number {
  return playerCount <= 4 ? 1 : 2;
}

/**
 * Sort cards by rank (lowest first)
 */
export function sortCardsByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.rank - b.rank);
}

/**
 * Group cards by rank
 */
export function groupCardsByRank(cards: Card[]): Map<number, Card[]> {
  const groups = new Map<number, Card[]>();

  for (const card of cards) {
    const existing = groups.get(card.rank) || [];
    existing.push(card);
    groups.set(card.rank, existing);
  }

  return groups;
}
