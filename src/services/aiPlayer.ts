import type { Card, Player, AIDifficulty } from '@/types';
import { SPECIAL_CARDS } from '@/types';
import { findValidMoves, canPlayCards, willCauseBurn } from './gameEngine';
import { sortCardsByRank } from './deckService';

/**
 * AI Player service for Shithead
 * Implements different difficulty levels with varying strategies
 */

export interface AIMove {
  type: 'play' | 'pickup' | 'blind';
  cards?: Card[];
  blindIndex?: number;
}

/**
 * Calculate the best move for an AI player
 */
export function calculateMove(
  player: Player,
  discardPile: Card[],
  deckEmpty: boolean,
  difficulty: AIDifficulty
): AIMove {
  // If playing from face-down cards, must play blind
  if (player.hand.length === 0 && player.faceUp.length === 0 && player.faceDown.length > 0) {
    return calculateBlindMove(player, difficulty);
  }

  const validMoves = findValidMoves(player, discardPile, deckEmpty);

  // No valid moves - must pickup
  if (validMoves.length === 0) {
    return { type: 'pickup' };
  }

  // Choose move based on difficulty
  switch (difficulty) {
    case 'easy':
      return calculateEasyMove(validMoves);
    case 'medium':
      return calculateMediumMove(validMoves, discardPile);
    case 'hard':
      return calculateHardMove(validMoves, discardPile, player);
    default:
      return calculateMediumMove(validMoves, discardPile);
  }
}

/**
 * Easy AI: Random valid move
 */
function calculateEasyMove(validMoves: Card[][]): AIMove {
  const randomIndex = Math.floor(Math.random() * validMoves.length);
  return { type: 'play', cards: validMoves[randomIndex] };
}

/**
 * Medium AI: Basic strategy
 * - Play lowest valid card
 * - Save special cards (2, 3, 10) for when needed
 * - Try to complete burns with four-of-a-kind
 */
function calculateMediumMove(validMoves: Card[][], discardPile: Card[]): AIMove {
  // Check for four-of-a-kind burns
  const burnMove = findBurnOpportunity(validMoves, discardPile);
  if (burnMove) {
    return { type: 'play', cards: burnMove };
  }

  // Separate special and normal cards
  const specialMoves = validMoves.filter(m => isSpecialCard(m[0].rank));
  const normalMoves = validMoves.filter(m => !isSpecialCard(m[0].rank));

  // Prefer normal cards over special cards
  const preferredMoves = normalMoves.length > 0 ? normalMoves : specialMoves;

  // Sort by rank and play lowest
  const sorted = preferredMoves.sort((a, b) => a[0].rank - b[0].rank);

  // Prefer playing multiple cards of same rank
  const lowestRank = sorted[0][0].rank;
  const lowestRankMoves = sorted.filter(m => m[0].rank === lowestRank);
  const bestMove = lowestRankMoves.reduce((a, b) => a.length > b.length ? a : b);

  return { type: 'play', cards: bestMove };
}

/**
 * Hard AI: Advanced strategy
 * - Track what cards have been played (card counting)
 * - Optimal special card usage
 * - Strategic 7 plays to trap opponents
 * - Consider future moves
 */
function calculateHardMove(
  validMoves: Card[][],
  discardPile: Card[],
  player: Player
): AIMove {
  // Priority 1: Four-of-a-kind burn
  const burnMove = findBurnOpportunity(validMoves, discardPile);
  if (burnMove) {
    return { type: 'play', cards: burnMove };
  }

  // Priority 2: Play 10 only if pile is large (5+ cards)
  const tenMoves = validMoves.filter(m => m[0].rank === SPECIAL_CARDS.TEN);
  if (tenMoves.length > 0 && discardPile.length >= 5) {
    return { type: 'play', cards: tenMoves[0] };
  }

  // Priority 3: Strategic 7 play
  const sevenMove = considerSevenPlay(validMoves, player);
  if (sevenMove) {
    return { type: 'play', cards: sevenMove };
  }

  // Priority 4: Save 2s for emergencies
  const nonTwoMoves = validMoves.filter(m => m[0].rank !== SPECIAL_CARDS.TWO);
  const movesToConsider = nonTwoMoves.length > 0 ? nonTwoMoves : validMoves;

  // Priority 5: Play cards we have multiples of
  const bestMultiMove = findBestMultiCardPlay(movesToConsider);
  if (bestMultiMove) {
    return { type: 'play', cards: bestMultiMove };
  }

  // Default: Play lowest non-special card
  const normalMoves = movesToConsider.filter(m => !isSpecialCard(m[0].rank));
  if (normalMoves.length > 0) {
    const sorted = normalMoves.sort((a, b) => a[0].rank - b[0].rank);
    return { type: 'play', cards: sorted[0] };
  }

  // Fallback to any valid move
  return { type: 'play', cards: movesToConsider[0] };
}

/**
 * Calculate blind move (face-down card)
 * Hard AI tries to remember which positions had good cards
 */
function calculateBlindMove(player: Player, difficulty: AIDifficulty): AIMove {
  // All difficulties just pick randomly for blind plays
  // (In a more advanced version, hard AI could track swapped cards)
  const randomIndex = Math.floor(Math.random() * player.faceDown.length);
  return { type: 'blind', blindIndex: randomIndex };
}

/**
 * Check if a four-of-a-kind burn is possible
 */
function findBurnOpportunity(validMoves: Card[][], discardPile: Card[]): Card[] | null {
  for (const move of validMoves) {
    const result = willCauseBurn(move, discardPile);
    if (result.burn && result.reason === 'four_of_a_kind') {
      return move;
    }
  }
  return null;
}

/**
 * Consider playing a 7 to trap opponent
 */
function considerSevenPlay(validMoves: Card[][], player: Player): Card[] | null {
  const sevenMoves = validMoves.filter(m => m[0].rank === SPECIAL_CARDS.SEVEN);
  if (sevenMoves.length === 0) return null;

  // Check if we have low cards to follow up
  const lowCards = player.hand.filter(c => c.rank <= 7 || isSpecialCard(c.rank));

  // Only play 7 if we have good follow-up options
  if (lowCards.length >= 2) {
    return sevenMoves[0];
  }

  return null;
}

/**
 * Find the best multi-card play
 */
function findBestMultiCardPlay(validMoves: Card[][]): Card[] | null {
  // Find moves with multiple cards
  const multiCardMoves = validMoves.filter(m => m.length >= 2);
  if (multiCardMoves.length === 0) return null;

  // Prefer playing more cards of lower rank
  multiCardMoves.sort((a, b) => {
    if (a.length !== b.length) return b.length - a.length;
    return a[0].rank - b[0].rank;
  });

  return multiCardMoves[0];
}

/**
 * Check if a rank is a special card
 */
function isSpecialCard(rank: number): boolean {
  return rank === SPECIAL_CARDS.TWO ||
         rank === SPECIAL_CARDS.THREE ||
         rank === SPECIAL_CARDS.SEVEN ||
         rank === SPECIAL_CARDS.TEN;
}

/**
 * Evaluate hand strength (used for deciding to pick up)
 */
export function evaluateHandStrength(player: Player): number {
  let score = 0;
  const allCards = [...player.hand, ...player.faceUp];

  for (const card of allCards) {
    switch (card.rank) {
      case SPECIAL_CARDS.TWO:
        score += 15; // Very valuable
        break;
      case SPECIAL_CARDS.THREE:
        score += 10; // Valuable
        break;
      case SPECIAL_CARDS.TEN:
        score += 20; // Most valuable
        break;
      case SPECIAL_CARDS.SEVEN:
        score += 8; // Situationally valuable
        break;
      case 14: // Ace
        score += 12;
        break;
      default:
        score += 15 - card.rank; // Lower cards are more flexible
    }
  }

  return score;
}

/**
 * Get AI thinking delay in milliseconds
 */
export function getAIThinkingDelay(difficulty: AIDifficulty): number {
  switch (difficulty) {
    case 'easy':
      return 500 + Math.random() * 500; // 0.5 - 1s
    case 'medium':
      return 800 + Math.random() * 700; // 0.8 - 1.5s
    case 'hard':
      return 1200 + Math.random() * 800; // 1.2 - 2s
  }
}
