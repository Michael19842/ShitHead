import type { Card } from '@/types';

// Serialized card format for database (compact)
export interface SerializedCard {
  s: string;  // suit first char: h/d/c/s
  r: number;  // rank 2-14
  i: string;  // id
}

// Convert Card to compact database format
export function serializeCard(card: Card): SerializedCard {
  return {
    s: card.suit.charAt(0),
    r: card.rank,
    i: card.id
  };
}

// Convert compact database format back to Card
export function deserializeCard(data: SerializedCard): Card {
  const suitMap: Record<string, Card['suit']> = {
    h: 'hearts',
    d: 'diamonds',
    c: 'clubs',
    s: 'spades'
  };

  return {
    suit: suitMap[data.s] || 'hearts',
    rank: data.r,
    id: data.i
  };
}

// Serialize array of cards
export function serializeCards(cards: Card[]): SerializedCard[] {
  return cards.map(serializeCard);
}

// Deserialize array of cards
export function deserializeCards(data: SerializedCard[]): Card[] {
  if (!data || !Array.isArray(data)) return [];
  return data.map(deserializeCard);
}

// Convert Date to ISO string for Supabase
export function toTimestamp(date: Date): string {
  return date.toISOString();
}

// Convert ISO string from Supabase to Date
export function fromTimestamp(timestamp: string): Date {
  return new Date(timestamp);
}
