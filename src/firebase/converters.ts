import { Timestamp } from 'firebase/firestore';
import type { Card } from '@/types';

// Serialized card format for Firestore (compact)
export interface SerializedCard {
  s: string;  // suit first char: h/d/c/s
  r: number;  // rank 2-14
  i: string;  // id
}

// Convert Card to compact Firestore format
export function serializeCard(card: Card): SerializedCard {
  return {
    s: card.suit.charAt(0),
    r: card.rank,
    i: card.id
  };
}

// Convert compact Firestore format back to Card
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
  return data.map(deserializeCard);
}

// Convert Date to Firestore Timestamp
export function toTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

// Convert Firestore Timestamp to Date
export function fromTimestamp(timestamp: Timestamp): Date {
  return timestamp.toDate();
}
