import { describe, it, expect, beforeEach } from 'vitest';
import {
  canPlayCards,
  willCauseBurn,
  getEffectiveTopCard,
  isSevenActive,
  initializeGame,
  hasValidMove,
  executePlay,
  executeBlindPlay,
  executePickup,
  getNextPlayerIndex,
  isGameOver,
  findValidMoves
} from '@/services/gameEngine';
import { createDeck, shuffleDeck } from '@/services/deckService';
import type { Card, Player } from '@/types';

// Helper to create a card
function card(rank: number, suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' = 'hearts'): Card {
  return { rank, suit, id: `${suit}-${rank}-test` };
}

describe('Game Engine', () => {
  describe('canPlayCards', () => {
    it('allows any card on empty pile', () => {
      expect(canPlayCards([card(5)], [])).toBe(true);
      expect(canPlayCards([card(14)], [])).toBe(true);
    });

    it('allows higher or equal cards', () => {
      const pile = [card(5)];
      expect(canPlayCards([card(5)], pile)).toBe(true);
      expect(canPlayCards([card(6)], pile)).toBe(true);
      expect(canPlayCards([card(14)], pile)).toBe(true);
    });

    it('rejects lower cards', () => {
      const pile = [card(8)];
      expect(canPlayCards([card(4)], pile)).toBe(false);
      expect(canPlayCards([card(7)], pile)).toBe(false);
    });

    it('requires all cards to be same rank', () => {
      expect(canPlayCards([card(5), card(6)], [])).toBe(false);
      expect(canPlayCards([card(5), card(5, 'diamonds')], [])).toBe(true);
    });

    describe('Special card: 2 (Reset)', () => {
      it('can be played on any card', () => {
        expect(canPlayCards([card(2)], [card(14)])).toBe(true);
        expect(canPlayCards([card(2)], [card(7)])).toBe(true);
        expect(canPlayCards([card(2)], [])).toBe(true);
      });
    });

    describe('Special card: 3 (Glass)', () => {
      it('can be played on any card', () => {
        expect(canPlayCards([card(3)], [card(14)])).toBe(true);
        expect(canPlayCards([card(3)], [card(2)])).toBe(true);
      });

      it('next card must beat card under the 3', () => {
        const pile = [card(6), card(3)];
        expect(canPlayCards([card(6)], pile)).toBe(true); // 6 >= 6
        expect(canPlayCards([card(7)], pile)).toBe(true); // 7 > 6
        expect(canPlayCards([card(5)], pile)).toBe(false); // 5 < 6
      });

      it('handles multiple 3s stacked', () => {
        const pile = [card(4), card(3), card(3)];
        expect(canPlayCards([card(4)], pile)).toBe(true);
        // 3 is a special card, so it can always be played
        expect(canPlayCards([card(3)], pile)).toBe(true);
      });
    });

    describe('Special card: 7 (Cap)', () => {
      it('can only be played on 7 or lower', () => {
        expect(canPlayCards([card(7)], [card(5)])).toBe(true);
        expect(canPlayCards([card(7)], [card(7)])).toBe(true);
        expect(canPlayCards([card(7)], [card(8)])).toBe(false);
        expect(canPlayCards([card(7)], [card(14)])).toBe(false);
      });

      it('after 7, only 7 or lower can be played', () => {
        const pile = [card(7)];
        expect(canPlayCards([card(5)], pile)).toBe(true);
        expect(canPlayCards([card(7)], pile)).toBe(true);
        expect(canPlayCards([card(8)], pile)).toBe(false);
        expect(canPlayCards([card(14)], pile)).toBe(false);
      });

      it('2 resets the 7 rule', () => {
        const pile = [card(7), card(2)];
        expect(canPlayCards([card(14)], pile)).toBe(true);
      });

      it('3 does not reset the 7 rule', () => {
        const pile = [card(7), card(3)];
        expect(canPlayCards([card(8)], pile)).toBe(false);
        expect(canPlayCards([card(5)], pile)).toBe(true);
      });

      it('special cards (2, 10) can still be played after 7', () => {
        const pile = [card(7)];
        expect(canPlayCards([card(2)], pile)).toBe(true);
        expect(canPlayCards([card(10)], pile)).toBe(true);
      });
    });

    describe('Special card: 10 (Burn)', () => {
      it('can be played on any card', () => {
        expect(canPlayCards([card(10)], [card(14)])).toBe(true);
        expect(canPlayCards([card(10)], [card(2)])).toBe(true);
        expect(canPlayCards([card(10)], [])).toBe(true);
      });
    });
  });

  describe('willCauseBurn', () => {
    it('burns when 10 is played', () => {
      const result = willCauseBurn([card(10)], [card(5)]);
      expect(result.burn).toBe(true);
      expect(result.reason).toBe('ten');
    });

    it('burns with four of a kind', () => {
      const pile = [card(8), card(8), card(8)];
      const result = willCauseBurn([card(8)], pile);
      expect(result.burn).toBe(true);
      expect(result.reason).toBe('four_of_a_kind');
    });

    it('burns when playing multiple cards to complete four', () => {
      const pile = [card(6), card(6)];
      const result = willCauseBurn([card(6), card(6, 'diamonds')], pile);
      expect(result.burn).toBe(true);
      expect(result.reason).toBe('four_of_a_kind');
    });

    it('does not burn with less than four of a kind', () => {
      const pile = [card(8), card(8)];
      const result = willCauseBurn([card(8)], pile);
      expect(result.burn).toBe(false);
    });

    it('only counts consecutive cards of same rank', () => {
      const pile = [card(8), card(5), card(8), card(8)];
      const result = willCauseBurn([card(8)], pile);
      // Only counts the last 2 eights + the played one = 3
      expect(result.burn).toBe(false);
    });
  });

  describe('getEffectiveTopCard', () => {
    it('returns top card normally', () => {
      const pile = [card(5), card(8)];
      expect(getEffectiveTopCard(pile)?.rank).toBe(8);
    });

    it('looks through 3s', () => {
      const pile = [card(5), card(3)];
      expect(getEffectiveTopCard(pile)?.rank).toBe(5);
    });

    it('looks through multiple 3s', () => {
      const pile = [card(6), card(3), card(3), card(3)];
      expect(getEffectiveTopCard(pile)?.rank).toBe(6);
    });

    it('returns null for empty pile', () => {
      expect(getEffectiveTopCard([])).toBeNull();
    });

    it('returns null if all 3s', () => {
      const pile = [card(3), card(3)];
      expect(getEffectiveTopCard(pile)).toBeNull();
    });
  });

  describe('isSevenActive', () => {
    it('returns true when 7 is on top', () => {
      expect(isSevenActive([card(7)])).toBe(true);
    });

    it('returns true when 7 under 3s', () => {
      expect(isSevenActive([card(7), card(3)])).toBe(true);
      expect(isSevenActive([card(7), card(3), card(3)])).toBe(true);
    });

    it('returns false when 2 played after 7', () => {
      expect(isSevenActive([card(7), card(2)])).toBe(false);
    });

    it('returns false when other card on top', () => {
      expect(isSevenActive([card(7), card(5)])).toBe(false);
      expect(isSevenActive([card(5)])).toBe(false);
    });

    it('returns false for empty pile', () => {
      expect(isSevenActive([])).toBe(false);
    });
  });

  describe('initializeGame', () => {
    it('creates correct number of players', () => {
      const result = initializeGame(3, ['A', 'B', 'C'], 1);
      expect(result.players.length).toBe(3);
    });

    it('deals 12 cards per player', () => {
      const result = initializeGame(2, ['A', 'B'], 1);
      for (const player of result.players) {
        const totalCards = player.hand.length + player.faceUp.length + player.faceDown.length;
        expect(totalCards).toBe(12);
        expect(player.hand.length).toBe(4);
        expect(player.faceUp.length).toBe(4);
        expect(player.faceDown.length).toBe(4);
      }
    });

    it('marks AI players correctly', () => {
      const result = initializeGame(3, ['Human', 'AI1', 'AI2'], 1);
      expect(result.players[0].isAI).toBe(false);
      expect(result.players[1].isAI).toBe(true);
      expect(result.players[2].isAI).toBe(true);
    });

    it('uses 2 decks for 5+ players', () => {
      const result = initializeGame(5, ['A', 'B', 'C', 'D', 'E'], 1);
      expect(result.deckCount).toBe(2);
    });
  });

  describe('executePlay', () => {
    let player: Player;
    let discardPile: Card[];
    let deck: Card[];

    beforeEach(() => {
      player = {
        id: 'test',
        name: 'Test',
        hand: [card(5), card(6), card(7)],
        faceUp: [],
        faceDown: [],
        isAI: false,
        isOut: false
      };
      discardPile = [card(4)];
      deck = [card(8), card(9), card(10)];
    });

    it('removes played cards from hand', () => {
      executePlay(player, [card(5)], discardPile, deck);
      expect(player.hand.find(c => c.rank === 5)).toBeUndefined();
    });

    it('adds cards to discard pile', () => {
      executePlay(player, [card(5)], discardPile, deck);
      expect(discardPile[discardPile.length - 1].rank).toBe(5);
    });

    it('draws cards to replenish hand', () => {
      executePlay(player, [card(5)], discardPile, deck);
      expect(player.hand.length).toBe(4); // 3 - 1 + 2 drawn... wait
      // Actually: started with 3, played 1, should draw 2 to get to 4
      // But deck has 3 cards, so should draw until 4
    });

    it('returns burned: true when 10 played', () => {
      player.hand.push(card(10));
      const result = executePlay(player, [card(10)], discardPile, deck);
      expect(result.burned).toBe(true);
    });

    it('returns playerOut: true when player has no cards left', () => {
      player.hand = [card(5)];
      deck.length = 0;
      const result = executePlay(player, [card(5)], discardPile, deck);
      expect(result.playerOut).toBe(true);
    });
  });

  describe('executePickup', () => {
    it('moves all pile cards to player hand', () => {
      const player: Player = {
        id: 'test',
        name: 'Test',
        hand: [card(3)],
        faceUp: [],
        faceDown: [],
        isAI: false,
        isOut: false
      };
      const pile = [card(5), card(6), card(7)];

      executePickup(player, pile);

      expect(player.hand.length).toBe(4);
      expect(pile.length).toBe(0);
    });
  });

  describe('getNextPlayerIndex', () => {
    const players: Player[] = [
      { id: '0', name: 'A', hand: [], faceUp: [], faceDown: [], isAI: false, isOut: false },
      { id: '1', name: 'B', hand: [], faceUp: [], faceDown: [], isAI: false, isOut: false },
      { id: '2', name: 'C', hand: [], faceUp: [], faceDown: [], isAI: false, isOut: true },
      { id: '3', name: 'D', hand: [], faceUp: [], faceDown: [], isAI: false, isOut: false },
    ];

    it('moves to next player', () => {
      expect(getNextPlayerIndex(0, players)).toBe(1);
    });

    it('wraps around', () => {
      expect(getNextPlayerIndex(3, players)).toBe(0);
    });

    it('skips players who are out', () => {
      expect(getNextPlayerIndex(1, players)).toBe(3); // skips player 2
    });
  });

  describe('isGameOver', () => {
    it('returns false with multiple active players', () => {
      const players: Player[] = [
        { id: '0', name: 'A', hand: [], faceUp: [], faceDown: [], isAI: false, isOut: false },
        { id: '1', name: 'B', hand: [], faceUp: [], faceDown: [], isAI: false, isOut: false },
      ];
      expect(isGameOver(players)).toBe(false);
    });

    it('returns true with one active player', () => {
      const players: Player[] = [
        { id: '0', name: 'A', hand: [], faceUp: [], faceDown: [], isAI: false, isOut: true },
        { id: '1', name: 'B', hand: [], faceUp: [], faceDown: [], isAI: false, isOut: false },
      ];
      expect(isGameOver(players)).toBe(true);
    });
  });

  describe('findValidMoves', () => {
    it('finds all valid single card plays', () => {
      const player: Player = {
        id: 'test',
        name: 'Test',
        hand: [card(5), card(6), card(8)],
        faceUp: [],
        faceDown: [],
        isAI: false,
        isOut: false
      };
      const pile = [card(5)];

      const moves = findValidMoves(player, pile, false);

      // Should find: 5, 6, 8 as valid plays
      expect(moves.some(m => m.length === 1 && m[0].rank === 5)).toBe(true);
      expect(moves.some(m => m.length === 1 && m[0].rank === 6)).toBe(true);
      expect(moves.some(m => m.length === 1 && m[0].rank === 8)).toBe(true);
    });

    it('finds multi-card plays of same rank', () => {
      const player: Player = {
        id: 'test',
        name: 'Test',
        hand: [card(5), card(5, 'diamonds'), card(5, 'clubs')],
        faceUp: [],
        faceDown: [],
        isAI: false,
        isOut: false
      };
      const pile = [card(4)];

      const moves = findValidMoves(player, pile, false);

      // Should find plays of 1, 2, and 3 fives
      expect(moves.some(m => m.length === 1 && m[0].rank === 5)).toBe(true);
      expect(moves.some(m => m.length === 2 && m[0].rank === 5)).toBe(true);
      expect(moves.some(m => m.length === 3 && m[0].rank === 5)).toBe(true);
    });
  });
});

describe('Deck Service', () => {
  describe('createDeck', () => {
    it('creates 52 cards', () => {
      const deck = createDeck();
      expect(deck.length).toBe(52);
    });

    it('has all suits and ranks', () => {
      const deck = createDeck();
      const suits = new Set(deck.map(c => c.suit));
      const ranks = new Set(deck.map(c => c.rank));

      expect(suits.size).toBe(4);
      expect(ranks.size).toBe(13);
    });
  });

  describe('shuffleDeck', () => {
    it('maintains deck size', () => {
      const deck = createDeck();
      shuffleDeck(deck);
      expect(deck.length).toBe(52);
    });

    it('randomizes order', () => {
      const deck1 = createDeck();
      const deck2 = createDeck();
      shuffleDeck(deck1);

      // Very unlikely to be in same order
      const sameOrder = deck1.every((c, i) => c.id === deck2[i].id);
      expect(sameOrder).toBe(false);
    });
  });
});
