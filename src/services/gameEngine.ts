import type { Card, Player, MoveResult, PlayerPhase } from '@/types';
import { SPECIAL_CARDS } from '@/types';
import { createMultiDeck, shuffleDeck, dealCards, getRequiredDecks } from './deckService';

/**
 * Core game engine for Shithead card game
 */

// ============================================================================
// GAME INITIALIZATION
// ============================================================================

export interface GameInitResult {
  players: Player[];
  deck: Card[];
  deckCount: number;
}

/**
 * Initialize a new game with the given settings
 */
export function initializeGame(
  playerCount: number,
  playerNames: string[],
  humanCount: number
): GameInitResult {
  const deckCount = getRequiredDecks(playerCount);
  let deck = createMultiDeck(deckCount);
  deck = shuffleDeck(deck);

  const { players, remainingDeck } = dealCards(deck, playerCount, playerNames, humanCount);

  return {
    players,
    deck: remainingDeck,
    deckCount
  };
}

// ============================================================================
// CARD VALIDATION
// ============================================================================

/**
 * Get the effective card that needs to be beaten (looks through 3s)
 */
export function getEffectiveTopCard(discardPile: Card[]): Card | null {
  for (let i = discardPile.length - 1; i >= 0; i--) {
    const card = discardPile[i];
    if (card.rank !== SPECIAL_CARDS.THREE) {
      return card;
    }
  }
  return null; // All 3s or empty pile
}

/**
 * Check if a 7 is currently active (next play must be 7 or lower)
 */
export function isSevenActive(discardPile: Card[]): boolean {
  for (let i = discardPile.length - 1; i >= 0; i--) {
    const card = discardPile[i];
    if (card.rank === SPECIAL_CARDS.SEVEN) return true;
    if (card.rank === SPECIAL_CARDS.TWO) return false; // 2 resets
    if (card.rank !== SPECIAL_CARDS.THREE) return false; // Non-3 breaks chain
  }
  return false;
}

/**
 * Check if cards can be played on the current pile
 */
export function canPlayCards(cards: Card[], discardPile: Card[]): boolean {
  if (cards.length === 0) return false;

  // All cards must be the same rank
  const rank = cards[0].rank;
  if (!cards.every(c => c.rank === rank)) return false;

  // Special cards that can always be played
  if (rank === SPECIAL_CARDS.TWO || rank === SPECIAL_CARDS.THREE || rank === SPECIAL_CARDS.TEN) {
    return true;
  }

  // Empty pile - anything goes
  if (discardPile.length === 0) return true;

  // Check 7 rule
  const sevenActive = isSevenActive(discardPile);
  if (sevenActive) {
    // After a 7, must play 7 or lower (or special cards handled above)
    return rank <= SPECIAL_CARDS.SEVEN;
  }

  // 7 can only be played on 7 or lower
  if (rank === SPECIAL_CARDS.SEVEN) {
    const effectiveCard = getEffectiveTopCard(discardPile);
    if (effectiveCard && effectiveCard.rank > SPECIAL_CARDS.SEVEN) {
      return false;
    }
    return true;
  }

  // Normal card - must be >= effective top card
  const effectiveCard = getEffectiveTopCard(discardPile);
  if (!effectiveCard) return true; // All 3s, can play anything

  return rank >= effectiveCard.rank;
}

/**
 * Check if playing these cards will cause a burn
 *
 * Burn rules:
 * - Playing a 10 always burns
 * - Four of the same rank on top burns (e.g., 4444)
 * - Four of the same rank with 3's in between also burns (e.g., 44434, 43444)
 * - BUT: Four 3's only burn if they are consecutive (3333), not if other cards are mixed in
 *   (e.g., 33343 does NOT burn because 3's don't "look through" themselves)
 */
export function willCauseBurn(cards: Card[], discardPile: Card[]): { burn: boolean; reason?: 'ten' | 'four_of_a_kind' } {
  // Playing a 10 always burns
  if (cards[0].rank === SPECIAL_CARDS.TEN) {
    return { burn: true, reason: 'ten' };
  }

  const rank = cards[0].rank;
  let count = cards.length;

  // If playing 3's, count consecutive 3's only (3's don't look through themselves)
  if (rank === SPECIAL_CARDS.THREE) {
    // Count consecutive 3's on top of pile
    for (let i = discardPile.length - 1; i >= 0; i--) {
      if (discardPile[i].rank === SPECIAL_CARDS.THREE) {
        count++;
      } else {
        break; // Stop at first non-3
      }
    }

    if (count >= 4) {
      return { burn: true, reason: 'four_of_a_kind' };
    }
    return { burn: false };
  }

  // For non-3 cards: count matching cards, skipping over 3's (glass cards)
  for (let i = discardPile.length - 1; i >= 0; i--) {
    const pileCard = discardPile[i];

    if (pileCard.rank === rank) {
      // Same rank, count it
      count++;
    } else if (pileCard.rank === SPECIAL_CARDS.THREE) {
      // 3 is glass/transparent, skip it and keep looking
      continue;
    } else {
      // Different rank (not a 3), stop counting
      break;
    }
  }

  if (count >= 4) {
    return { burn: true, reason: 'four_of_a_kind' };
  }

  return { burn: false };
}

// ============================================================================
// MOVE EXECUTION
// ============================================================================

/**
 * Get which cards a player can currently play from
 */
export function getPlayerPhase(player: Player, deckEmpty: boolean): PlayerPhase {
  if (player.hand.length > 0 || !deckEmpty) {
    return 'HAND' as PlayerPhase;
  }
  if (player.faceUp.length > 0) {
    return 'FACE_UP' as PlayerPhase;
  }
  return 'FACE_DOWN' as PlayerPhase;
}

/**
 * Get playable cards for a player
 */
export function getPlayableCards(player: Player, deckEmpty: boolean): Card[] {
  const phase = getPlayerPhase(player, deckEmpty);

  switch (phase) {
    case 'HAND':
      return player.hand;
    case 'FACE_UP':
      return player.faceUp;
    case 'FACE_DOWN':
      return player.faceDown;
    default:
      return [];
  }
}

/**
 * Check if a player has any valid moves
 */
export function hasValidMove(player: Player, discardPile: Card[], deckEmpty: boolean): boolean {
  const playableCards = getPlayableCards(player, deckEmpty);

  for (const card of playableCards) {
    if (canPlayCards([card], discardPile)) {
      return true;
    }
  }

  return false;
}

/**
 * Execute a play action
 */
export function executePlay(
  player: Player,
  cards: Card[],
  discardPile: Card[],
  deck: Card[]
): MoveResult {
  // Validate the move
  if (!canPlayCards(cards, discardPile)) {
    return { success: false, message: 'Ongeldige zet' };
  }

  // Remove cards from player
  const cardIds = new Set(cards.map(c => c.id));
  player.hand = player.hand.filter(c => !cardIds.has(c.id));
  player.faceUp = player.faceUp.filter(c => !cardIds.has(c.id));
  player.faceDown = player.faceDown.filter(c => !cardIds.has(c.id));

  // Add cards to discard pile
  discardPile.push(...cards);

  // Check for burn
  const burnResult = willCauseBurn(cards, discardPile.slice(0, -cards.length));

  // Draw cards to replenish hand (up to 4)
  while (player.hand.length < 4 && deck.length > 0) {
    const card = deck.pop();
    if (card) player.hand.push(card);
  }

  // Check if player is out
  const playerOut = player.hand.length === 0 &&
                    player.faceUp.length === 0 &&
                    player.faceDown.length === 0;

  return {
    success: true,
    burned: burnResult.burn,
    playerOut
  };
}

/**
 * Execute a face-down card play (blind play)
 * The card is revealed and played - if invalid, player picks up the pile
 */
export function executeBlindPlay(
  player: Player,
  cardIndex: number,
  discardPile: Card[]
): MoveResult & { card: Card; mustPickup: boolean } {
  if (cardIndex < 0 || cardIndex >= player.faceDown.length) {
    return {
      success: false,
      message: 'Ongeldige kaart index',
      card: null as unknown as Card,
      mustPickup: false
    };
  }

  // Remove and reveal the card
  const [card] = player.faceDown.splice(cardIndex, 1);

  // Check if card is playable
  if (canPlayCards([card], discardPile)) {
    discardPile.push(card);

    const burnResult = willCauseBurn([card], discardPile.slice(0, -1));
    const playerOut = player.hand.length === 0 &&
                      player.faceUp.length === 0 &&
                      player.faceDown.length === 0;

    return {
      success: true,
      card,
      burned: burnResult.burn,
      playerOut,
      mustPickup: false
    };
  } else {
    // Card not playable - player must pick up pile including this card
    return {
      success: true,
      card,
      mustPickup: true
    };
  }
}

/**
 * Execute picking up the discard pile
 */
export function executePickup(player: Player, discardPile: Card[]): Card[] {
  const pickedUp = [...discardPile];
  player.hand.push(...pickedUp);
  discardPile.length = 0; // Clear the pile
  return pickedUp;
}

// ============================================================================
// GAME FLOW
// ============================================================================

/**
 * Get the next player index (skips players who are out)
 */
export function getNextPlayerIndex(
  currentIndex: number,
  players: Player[],
  skipCount = 1,
  direction: 1 | -1 = 1
): number {
  let nextIndex = currentIndex;
  let skipped = 0;
  const playerCount = players.length;

  while (skipped < skipCount) {
    // Handle both positive and negative directions with proper modulo
    nextIndex = ((nextIndex + direction) % playerCount + playerCount) % playerCount;
    if (!players[nextIndex].isOut) {
      skipped++;
    }
    // Safety check for infinite loop
    if (nextIndex === currentIndex && skipped === 0) {
      break;
    }
  }

  return nextIndex;
}

/**
 * Count active players (not out)
 */
export function countActivePlayers(players: Player[]): number {
  return players.filter(p => !p.isOut).length;
}

/**
 * Check if game is over (only one player left)
 */
export function isGameOver(players: Player[]): boolean {
  return countActivePlayers(players) <= 1;
}

/**
 * Get the loser (last remaining player)
 */
export function getLoser(players: Player[]): Player | null {
  const active = players.filter(p => !p.isOut);
  return active.length === 1 ? active[0] : null;
}

// ============================================================================
// STARTING PLAYER DETERMINATION
// ============================================================================

/**
 * Determine which player starts the game based on lowest card in hand.
 * The player with the lowest card (first checking for 4, then 5, etc.) starts.
 * Returns the index of the starting player.
 */
export function determineStartingPlayer(players: Player[]): number {
  const result = getStartingPlayerAndCards(players);
  return result.playerIndex;
}

/**
 * Result of determining the starting player and their opening cards
 */
export interface StartingPlayerResult {
  playerIndex: number;
  startingCards: Card[];
  startingRank: number;
}

/**
 * Determine which player starts and which cards they must play first.
 * The player with the lowest card (starting from 4) starts and must play
 * ALL cards of that rank from their hand.
 */
export function getStartingPlayerAndCards(players: Player[]): StartingPlayerResult {
  // Start checking from rank 4, then 5, 6, etc. up to Ace (14)
  // We skip 2 and 3 because they are special cards
  for (let rank = 4; rank <= 14; rank++) {
    for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
      const player = players[playerIndex];
      // Find all cards of this rank in hand
      const matchingCards = player.hand.filter(card => card.rank === rank);
      if (matchingCards.length > 0) {
        return {
          playerIndex,
          startingCards: matchingCards,
          startingRank: rank
        };
      }
    }
  }

  // If no one has 4-14, check for 3s and 2s (unlikely but possible)
  for (let rank = 3; rank >= 2; rank--) {
    for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
      const player = players[playerIndex];
      const matchingCards = player.hand.filter(card => card.rank === rank);
      if (matchingCards.length > 0) {
        return {
          playerIndex,
          startingCards: matchingCards,
          startingRank: rank
        };
      }
    }
  }

  // Fallback: first player starts with no forced cards
  return {
    playerIndex: 0,
    startingCards: [],
    startingRank: 0
  };
}

// ============================================================================
// AI HELPERS
// ============================================================================

/**
 * Find all valid moves for a player
 */
export function findValidMoves(player: Player, discardPile: Card[], deckEmpty: boolean): Card[][] {
  const playableCards = getPlayableCards(player, deckEmpty);
  const validMoves: Card[][] = [];
  const groupedByRank = new Map<number, Card[]>();

  // Group cards by rank
  for (const card of playableCards) {
    const group = groupedByRank.get(card.rank) || [];
    group.push(card);
    groupedByRank.set(card.rank, group);
  }

  // For each rank, if playable, add all possible combinations
  for (const [rank, cards] of groupedByRank) {
    if (canPlayCards([cards[0]], discardPile)) {
      // Add single card plays
      for (const card of cards) {
        validMoves.push([card]);
      }
      // Add multi-card plays (2, 3, or 4 of same rank)
      if (cards.length >= 2) {
        validMoves.push([...cards.slice(0, 2)]);
      }
      if (cards.length >= 3) {
        validMoves.push([...cards.slice(0, 3)]);
      }
      if (cards.length >= 4) {
        validMoves.push([...cards]);
      }
    }
  }

  return validMoves;
}
