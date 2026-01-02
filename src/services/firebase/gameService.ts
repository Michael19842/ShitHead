import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  runTransaction,
  arrayUnion
} from 'firebase/firestore';
import { getFirebaseDb } from '@/firebase';
import { serializeCards, deserializeCards, type SerializedCard } from '@/firebase/converters';
import type { Card, OnlineGame, OnlineGamePlayer, TurnState, EmojiReaction, Lobby } from '@/types';
import { createDeck, shuffleDeck } from '@/services/deckService';
import { canPlayCards, willCauseBurn, getNextPlayerIndex, getStartingPlayerAndCards } from '@/services/gameEngine';
import type { Player } from '@/types';

const TURN_TIMEOUT_SECONDS = 20;
const SWAP_TIMEOUT_SECONDS = 30;
const DISCONNECT_TIMEOUT_MS = 60 * 1000; // 1 minute

// Deal cards for one player (4 hand, 4 faceUp, 4 faceDown)
function dealCardsForPlayer(deck: Card[]): { hand: Card[]; faceUp: Card[]; faceDown: Card[]; remainingDeck: Card[] } {
  const hand: Card[] = [];
  const faceUp: Card[] = [];
  const faceDown: Card[] = [];

  // Deal 4 face-down
  for (let i = 0; i < 4 && deck.length > 0; i++) {
    faceDown.push(deck.pop()!);
  }

  // Deal 4 face-up
  for (let i = 0; i < 4 && deck.length > 0; i++) {
    faceUp.push(deck.pop()!);
  }

  // Deal 4 hand cards
  for (let i = 0; i < 4 && deck.length > 0; i++) {
    hand.push(deck.pop()!);
  }

  return { hand, faceUp, faceDown, remainingDeck: deck };
}

// Create a new online game from a lobby
export async function createGameFromLobby(lobbyId: string): Promise<string | null> {
  const db = getFirebaseDb();

  // First fetch the lobby
  const lobbyRef = doc(db, 'lobbies', lobbyId);
  const lobbyDoc = await getDoc(lobbyRef);

  if (!lobbyDoc.exists()) {
    throw new Error('Lobby not found');
  }

  const lobby = lobbyDoc.data() as Lobby;
  const gameRef = doc(collection(db, 'games'));

  // Create and shuffle deck
  const playerCount = Object.keys(lobby.players).length;
  const deckCount = playerCount <= 4 ? 1 : 2;
  let deck = deckCount === 1 ? createDeck() : [...createDeck(), ...createDeck()];
  deck = shuffleDeck(deck);

  // Deal cards to players
  const playerOrder = Object.keys(lobby.players);
  const players: Record<string, OnlineGamePlayer> = {};

  const now = Timestamp.now();

  for (const playerId of playerOrder) {
    const lobbyPlayer = lobby.players[playerId];
    const { hand, faceUp, faceDown, remainingDeck } = dealCardsForPlayer(deck);
    deck = remainingDeck;

    players[playerId] = {
      displayName: lobbyPlayer.displayName,
      hand,
      faceUp,
      faceDown,
      isOut: false,
      connectionStatus: 'connected',
      lastPingAt: now.toDate(),
      timeoutsThisGame: 0,
      swapConfirmed: false
    };
  }

  const swapExpiresAt = Timestamp.fromMillis(now.toMillis() + SWAP_TIMEOUT_SECONDS * 1000);

  const gameData = {
    lobbyId: lobbyId,
    status: 'swapping',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    playerOrder,
    players: serializeGamePlayers(players),
    deck: serializeCards(deck),
    deckCount,
    deckEmpty: false,
    discardPile: [],
    burnPile: [],
    currentPlayerIndex: 0,
    turnState: {
      playerId: playerOrder[0],
      startedAt: serverTimestamp(),
      expiresAt: swapExpiresAt,
      phase: 'swap'
    },
    swapPhase: {
      startedAt: serverTimestamp(),
      expiresAt: swapExpiresAt,
      confirmedPlayers: []
    },
    loserId: null,
    reactions: []
  };

  await setDoc(gameRef, gameData);

  // Update lobby with game ID and status
  await updateDoc(lobbyRef, {
    status: 'in_game',
    gameId: gameRef.id
  });

  return gameRef.id;
}

// Get game by ID
export async function getGame(gameId: string): Promise<OnlineGame | null> {
  const db = getFirebaseDb();
  const gameRef = doc(db, 'games', gameId);
  const gameDoc = await getDoc(gameRef);

  if (!gameDoc.exists()) {
    return null;
  }

  return docToGame(gameDoc.id, gameDoc.data());
}

// Subscribe to game updates
export function subscribeToGame(
  gameId: string,
  callback: (game: OnlineGame | null) => void
): () => void {
  const db = getFirebaseDb();
  const gameRef = doc(db, 'games', gameId);

  return onSnapshot(gameRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback(docToGame(snapshot.id, snapshot.data()));
  }, (error) => {
    console.error('Game subscription error:', error);
    callback(null);
  });
}

// Confirm swap phase (player is ready to play)
export async function confirmSwap(gameId: string, playerId: string): Promise<void> {
  const db = getFirebaseDb();
  const gameRef = doc(db, 'games', gameId);

  await runTransaction(db, async (transaction) => {
    const gameDoc = await transaction.get(gameRef);
    if (!gameDoc.exists()) throw new Error('Game not found');

    const data = gameDoc.data();
    const confirmedPlayers = data.swapPhase?.confirmedPlayers || [];

    if (confirmedPlayers.includes(playerId)) return;

    const newConfirmed = [...confirmedPlayers, playerId];

    // Check if all players confirmed
    if (newConfirmed.length === data.playerOrder.length) {
      // Convert online players to Player format for getStartingPlayerAndCards
      const playerOrder = data.playerOrder as string[];
      const playersForCalc: Player[] = playerOrder.map(pid => {
        const pd = data.players[pid];
        return {
          id: pid,
          name: pd.displayName || 'Speler',
          hand: deserializeCards(pd.hand),
          faceUp: deserializeCards(pd.faceUp),
          faceDown: deserializeCards(pd.faceDown),
          isAI: false,
          isOut: false
        };
      });

      // Determine starting player based on lowest card (4, then 5, etc.)
      const startingInfo = getStartingPlayerAndCards(playersForCalc);
      const startingPlayerId = playerOrder[startingInfo.playerIndex];

      // Start playing phase - the player with lowest card goes first
      const now = Timestamp.now();
      const turnExpiresAt = Timestamp.fromMillis(now.toMillis() + TURN_TIMEOUT_SECONDS * 1000);

      transaction.update(gameRef, {
        status: 'playing',
        swapPhase: null,
        'swapPhase.confirmedPlayers': newConfirmed,
        currentPlayerIndex: startingInfo.playerIndex,
        turnState: {
          playerId: startingPlayerId,
          startedAt: now,
          expiresAt: turnExpiresAt,
          phase: 'play'
        },
        updatedAt: serverTimestamp()
      });
    } else {
      transaction.update(gameRef, {
        'swapPhase.confirmedPlayers': newConfirmed,
        [`players.${playerId}.swapConfirmed`]: true,
        updatedAt: serverTimestamp()
      });
    }
  });
}

// Swap cards during swap phase
export async function swapCards(
  gameId: string,
  playerId: string,
  handCard: Card,
  faceUpCard: Card
): Promise<void> {
  const db = getFirebaseDb();
  const gameRef = doc(db, 'games', gameId);

  await runTransaction(db, async (transaction) => {
    const gameDoc = await transaction.get(gameRef);
    if (!gameDoc.exists()) throw new Error('Game not found');

    const data = gameDoc.data();
    if (data.status !== 'swapping') throw new Error('Not in swap phase');

    const playerData = data.players[playerId];
    if (!playerData) throw new Error('Player not in game');

    // Deserialize cards
    const hand = deserializeCards(playerData.hand);
    const faceUp = deserializeCards(playerData.faceUp);

    // Find and swap cards
    const handIndex = hand.findIndex(c => c.id === handCard.id);
    const faceUpIndex = faceUp.findIndex(c => c.id === faceUpCard.id);

    if (handIndex === -1 || faceUpIndex === -1) {
      throw new Error('Card not found');
    }

    // Swap
    const temp = hand[handIndex];
    hand[handIndex] = faceUp[faceUpIndex];
    faceUp[faceUpIndex] = temp;

    transaction.update(gameRef, {
      [`players.${playerId}.hand`]: serializeCards(hand),
      [`players.${playerId}.faceUp`]: serializeCards(faceUp),
      updatedAt: serverTimestamp()
    });
  });
}

// Play cards
export async function playCards(
  gameId: string,
  playerId: string,
  cards: Card[]
): Promise<{ success: boolean; error?: string; burned?: boolean }> {
  const db = getFirebaseDb();
  const gameRef = doc(db, 'games', gameId);

  try {
    return await runTransaction(db, async (transaction) => {
      const gameDoc = await transaction.get(gameRef);
      if (!gameDoc.exists()) throw new Error('Game not found');

      const data = gameDoc.data();
      if (data.status !== 'playing') throw new Error('Game not in playing state');

      // Verify it's this player's turn
      if (data.playerOrder[data.currentPlayerIndex] !== playerId) {
        throw new Error('Not your turn');
      }

      const playerData = data.players[playerId];
      const discardPile = deserializeCards(data.discardPile || []);

      // Validate move
      if (!canPlayCards(cards, discardPile)) {
        throw new Error('Invalid move');
      }

      // Check for burn
      const burnResult = willCauseBurn(cards, discardPile);
      const burned = burnResult.burn;

      // Remove cards from player
      let hand = deserializeCards(playerData.hand);
      let faceUp = deserializeCards(playerData.faceUp);
      let faceDown = deserializeCards(playerData.faceDown);

      for (const card of cards) {
        let found = false;

        const handIndex = hand.findIndex(c => c.id === card.id);
        if (handIndex !== -1) {
          hand.splice(handIndex, 1);
          found = true;
        }

        if (!found) {
          const faceUpIndex = faceUp.findIndex(c => c.id === card.id);
          if (faceUpIndex !== -1) {
            faceUp.splice(faceUpIndex, 1);
            found = true;
          }
        }

        if (!found) {
          throw new Error('Card not found in player hand');
        }
      }

      // Draw cards from deck if needed
      let deck = deserializeCards(data.deck || []);
      while (hand.length < 4 && deck.length > 0) {
        hand.push(deck.pop()!);
      }

      // Update discard pile
      let newDiscardPile = [...discardPile, ...cards];
      let burnPile = deserializeCards(data.burnPile || []);

      if (burned) {
        burnPile = [...burnPile, ...newDiscardPile];
        newDiscardPile = [];
      }

      // Check if player is out
      const isOut = hand.length === 0 && faceUp.length === 0 && faceDown.length === 0 && deck.length === 0;

      // Determine next player
      let nextPlayerIndex = data.currentPlayerIndex;
      if (!burned) {
        nextPlayerIndex = getNextPlayerIndex(data.currentPlayerIndex,
          data.playerOrder.map((id: string) => ({
            isOut: id === playerId ? isOut : data.players[id].isOut
          }))
        );
      }

      // Check for game over
      const activePlayers = data.playerOrder.filter((id: string) =>
        id === playerId ? !isOut : !data.players[id].isOut
      );
      const gameOver = activePlayers.length <= 1;

      const now = Timestamp.now();
      const turnExpiresAt = Timestamp.fromMillis(now.toMillis() + TURN_TIMEOUT_SECONDS * 1000);

      const updates: Record<string, unknown> = {
        [`players.${playerId}.hand`]: serializeCards(hand),
        [`players.${playerId}.faceUp`]: serializeCards(faceUp),
        [`players.${playerId}.faceDown`]: serializeCards(faceDown),
        [`players.${playerId}.isOut`]: isOut,
        deck: serializeCards(deck),
        deckEmpty: deck.length === 0,
        discardPile: serializeCards(newDiscardPile),
        burnPile: serializeCards(burnPile),
        currentPlayerIndex: nextPlayerIndex,
        turnState: {
          playerId: data.playerOrder[nextPlayerIndex],
          startedAt: now,
          expiresAt: turnExpiresAt,
          phase: 'play'
        },
        updatedAt: serverTimestamp()
      };

      if (gameOver) {
        updates.status = 'ended';
        updates.loserId = activePlayers[0] || null;
      }

      transaction.update(gameRef, updates);

      return { success: true, burned };
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Pick up the discard pile
export async function pickupPile(
  gameId: string,
  playerId: string
): Promise<{ success: boolean; error?: string; cardCount: number }> {
  const db = getFirebaseDb();
  const gameRef = doc(db, 'games', gameId);

  try {
    return await runTransaction(db, async (transaction) => {
      const gameDoc = await transaction.get(gameRef);
      if (!gameDoc.exists()) throw new Error('Game not found');

      const data = gameDoc.data();
      if (data.status !== 'playing') throw new Error('Game not in playing state');

      if (data.playerOrder[data.currentPlayerIndex] !== playerId) {
        throw new Error('Not your turn');
      }

      const playerData = data.players[playerId];
      const discardPile = deserializeCards(data.discardPile || []);

      if (discardPile.length === 0) {
        throw new Error('No cards to pick up');
      }

      // Add discard pile to hand
      let hand = deserializeCards(playerData.hand);
      hand = [...hand, ...discardPile];

      // Next player
      const nextPlayerIndex = getNextPlayerIndex(data.currentPlayerIndex,
        data.playerOrder.map((id: string) => ({ isOut: data.players[id].isOut }))
      );

      const now = Timestamp.now();
      const turnExpiresAt = Timestamp.fromMillis(now.toMillis() + TURN_TIMEOUT_SECONDS * 1000);

      transaction.update(gameRef, {
        [`players.${playerId}.hand`]: serializeCards(hand),
        discardPile: [],
        currentPlayerIndex: nextPlayerIndex,
        turnState: {
          playerId: data.playerOrder[nextPlayerIndex],
          startedAt: now,
          expiresAt: turnExpiresAt,
          phase: 'play'
        },
        updatedAt: serverTimestamp()
      });

      return { success: true, cardCount: discardPile.length };
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      cardCount: 0
    };
  }
}

// Handle turn timeout - auto pickup and increment timeout counter
export async function handleTurnTimeout(
  gameId: string,
  playerId: string
): Promise<{ success: boolean; error?: string; banned?: boolean }> {
  const db = getFirebaseDb();
  const gameRef = doc(db, 'games', gameId);

  try {
    return await runTransaction(db, async (transaction) => {
      const gameDoc = await transaction.get(gameRef);
      if (!gameDoc.exists()) throw new Error('Game not found');

      const data = gameDoc.data();
      if (data.status !== 'playing') throw new Error('Game not in playing state');

      // Verify it's this player's turn
      if (data.playerOrder[data.currentPlayerIndex] !== playerId) {
        throw new Error('Not your turn');
      }

      // Check if turn has actually expired
      const turnExpiresAt = (data.turnState.expiresAt as Timestamp).toMillis();
      if (Date.now() < turnExpiresAt) {
        throw new Error('Turn has not expired yet');
      }

      const playerData = data.players[playerId];
      const discardPile = deserializeCards(data.discardPile || []);

      // Increment timeout counter
      const timeoutsThisGame = (playerData.timeoutsThisGame || 0) + 1;
      const shouldBan = timeoutsThisGame >= 3;

      // Add discard pile to hand (if any cards)
      let hand = deserializeCards(playerData.hand);
      if (discardPile.length > 0) {
        hand = [...hand, ...discardPile];
      }

      // Next player
      const nextPlayerIndex = getNextPlayerIndex(data.currentPlayerIndex,
        data.playerOrder.map((id: string) => ({ isOut: data.players[id].isOut }))
      );

      const now = Timestamp.now();
      const turnExpiresAtNew = Timestamp.fromMillis(now.toMillis() + TURN_TIMEOUT_SECONDS * 1000);

      const updates: Record<string, unknown> = {
        [`players.${playerId}.hand`]: serializeCards(hand),
        [`players.${playerId}.timeoutsThisGame`]: timeoutsThisGame,
        discardPile: [],
        currentPlayerIndex: nextPlayerIndex,
        turnState: {
          playerId: data.playerOrder[nextPlayerIndex],
          startedAt: now,
          expiresAt: turnExpiresAtNew,
          phase: 'play'
        },
        updatedAt: serverTimestamp()
      };

      transaction.update(gameRef, updates);

      // Create ban if needed (done outside transaction)
      if (shouldBan) {
        // We'll handle ban creation separately
      }

      return { success: true, banned: shouldBan };
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Create a temporary ban for a player
export async function createBan(
  playerId: string,
  durationMinutes: number = 5
): Promise<void> {
  const db = getFirebaseDb();
  const banRef = doc(db, 'bans', playerId);

  const expiresAt = Timestamp.fromMillis(Date.now() + durationMinutes * 60 * 1000);

  await setDoc(banRef, {
    playerId,
    createdAt: serverTimestamp(),
    expiresAt,
    reason: 'timeout'
  });
}

// Check if player is currently banned
export async function checkBan(playerId: string): Promise<{ banned: boolean; expiresAt?: Date }> {
  const db = getFirebaseDb();
  const banRef = doc(db, 'bans', playerId);
  const banDoc = await getDoc(banRef);

  if (!banDoc.exists()) {
    return { banned: false };
  }

  const data = banDoc.data();
  const expiresAt = (data.expiresAt as Timestamp).toDate();

  if (expiresAt.getTime() < Date.now()) {
    // Ban has expired, clean it up
    return { banned: false };
  }

  return { banned: true, expiresAt };
}

// Play a blind (face-down) card
export async function playBlindCard(
  gameId: string,
  playerId: string,
  cardIndex: number
): Promise<{ success: boolean; error?: string; card?: Card; mustPickup?: boolean; burned?: boolean }> {
  const db = getFirebaseDb();
  const gameRef = doc(db, 'games', gameId);

  try {
    return await runTransaction(db, async (transaction) => {
      const gameDoc = await transaction.get(gameRef);
      if (!gameDoc.exists()) throw new Error('Game not found');

      const data = gameDoc.data();
      if (data.status !== 'playing') throw new Error('Game not in playing state');

      if (data.playerOrder[data.currentPlayerIndex] !== playerId) {
        throw new Error('Not your turn');
      }

      const playerData = data.players[playerId];
      let faceDown = deserializeCards(playerData.faceDown);

      if (cardIndex < 0 || cardIndex >= faceDown.length) {
        throw new Error('Invalid card index');
      }

      const card = faceDown[cardIndex];
      faceDown.splice(cardIndex, 1);

      const discardPile = deserializeCards(data.discardPile || []);
      const canPlay = canPlayCards([card], discardPile);

      let hand = deserializeCards(playerData.hand);
      let newDiscardPile = discardPile;
      let burnPile = deserializeCards(data.burnPile || []);
      let burned = false;
      let mustPickup = false;

      if (canPlay) {
        const burnResult = willCauseBurn([card], discardPile);
        burned = burnResult.burn;
        newDiscardPile = [...discardPile, card];

        if (burned) {
          burnPile = [...burnPile, ...newDiscardPile];
          newDiscardPile = [];
        }
      } else {
        // Must pick up pile including the played card
        hand = [...hand, ...discardPile, card];
        newDiscardPile = [];
        mustPickup = true;
      }

      // Check if player is out
      const isOut = hand.length === 0 && deserializeCards(playerData.faceUp).length === 0 &&
                    faceDown.length === 0 && deserializeCards(data.deck || []).length === 0;

      // Next player
      let nextPlayerIndex = data.currentPlayerIndex;
      if (!burned) {
        nextPlayerIndex = getNextPlayerIndex(data.currentPlayerIndex,
          data.playerOrder.map((id: string) => ({
            isOut: id === playerId ? isOut : data.players[id].isOut
          }))
        );
      }

      const now = Timestamp.now();
      const turnExpiresAt = Timestamp.fromMillis(now.toMillis() + TURN_TIMEOUT_SECONDS * 1000);

      transaction.update(gameRef, {
        [`players.${playerId}.hand`]: serializeCards(hand),
        [`players.${playerId}.faceDown`]: serializeCards(faceDown),
        [`players.${playerId}.isOut`]: isOut,
        discardPile: serializeCards(newDiscardPile),
        burnPile: serializeCards(burnPile),
        currentPlayerIndex: nextPlayerIndex,
        turnState: {
          playerId: data.playerOrder[nextPlayerIndex],
          startedAt: now,
          expiresAt: turnExpiresAt,
          phase: 'play'
        },
        updatedAt: serverTimestamp()
      });

      return { success: true, card, mustPickup, burned };
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Send emoji reaction
export async function sendReaction(
  gameId: string,
  playerId: string,
  emoji: EmojiReaction
): Promise<void> {
  const db = getFirebaseDb();
  const gameRef = doc(db, 'games', gameId);

  await updateDoc(gameRef, {
    reactions: arrayUnion({
      playerId,
      emoji,
      timestamp: Timestamp.now()
    })
  });
}

// Update player connection status
export async function updateConnectionStatus(
  gameId: string,
  playerId: string,
  status: 'connected' | 'disconnected'
): Promise<void> {
  const db = getFirebaseDb();
  const gameRef = doc(db, 'games', gameId);

  await updateDoc(gameRef, {
    [`players.${playerId}.connectionStatus`]: status,
    [`players.${playerId}.lastPingAt`]: serverTimestamp()
  });
}

// Remove disconnected players (after 1 minute timeout)
export async function removeDisconnectedPlayers(
  gameId: string
): Promise<{ removed: string[]; gameEnded: boolean; winner?: string }> {
  const db = getFirebaseDb();
  const gameRef = doc(db, 'games', gameId);

  try {
    return await runTransaction(db, async (transaction) => {
      const gameDoc = await transaction.get(gameRef);
      if (!gameDoc.exists()) {
        return { removed: [], gameEnded: false };
      }

      const data = gameDoc.data();
      if (data.status !== 'playing') {
        return { removed: [], gameEnded: false };
      }

      const now = Date.now();
      const playersData = data.players as Record<string, Record<string, unknown>> || {};
      const playerOrder = data.playerOrder as string[];
      const removedPlayers: string[] = [];

      // Find players to remove
      for (const playerId of playerOrder) {
        const player = playersData[playerId];
        if (!player) continue;

        const isOut = player.isOut as boolean;
        if (isOut) continue;

        const connectionStatus = player.connectionStatus as string;
        const lastPingAt = (player.lastPingAt as Timestamp)?.toMillis() || 0;

        if (connectionStatus === 'disconnected' && (now - lastPingAt) > DISCONNECT_TIMEOUT_MS) {
          removedPlayers.push(playerId);
        }
      }

      if (removedPlayers.length === 0) {
        return { removed: [], gameEnded: false };
      }

      // Build updates
      const updates: Record<string, unknown> = {
        updatedAt: serverTimestamp()
      };

      // Mark removed players as out and clear their cards
      let burnPile = deserializeCards(data.burnPile || []);
      for (const playerId of removedPlayers) {
        const player = playersData[playerId];
        // Add their cards to burn pile
        const hand = deserializeCards((player.hand as SerializedCard[]) || []);
        const faceUp = deserializeCards((player.faceUp as SerializedCard[]) || []);
        const faceDown = deserializeCards((player.faceDown as SerializedCard[]) || []);
        burnPile = [...burnPile, ...hand, ...faceUp, ...faceDown];

        updates[`players.${playerId}.isOut`] = true;
        updates[`players.${playerId}.hand`] = [];
        updates[`players.${playerId}.faceUp`] = [];
        updates[`players.${playerId}.faceDown`] = [];
      }

      updates.burnPile = serializeCards(burnPile);

      // Count remaining active players
      const activePlayers = playerOrder.filter(id => {
        if (removedPlayers.includes(id)) return false;
        return !(playersData[id]?.isOut as boolean);
      });

      // Check if game should end
      if (activePlayers.length <= 1) {
        updates.status = 'ended';
        // The remaining player loses (they're the shithead) - but if only 1 left due to disconnects, they win
        // Actually in this case, if everyone else disconnected, the last player wins (is NOT the shithead)
        updates.loserId = null; // No loser - winner by default
        transaction.update(gameRef, updates);
        return {
          removed: removedPlayers,
          gameEnded: true,
          winner: activePlayers[0] || undefined
        };
      }

      // If current player was removed, advance to next player
      let currentIndex = data.currentPlayerIndex as number;
      const currentPlayerId = playerOrder[currentIndex];

      if (removedPlayers.includes(currentPlayerId)) {
        // Find next active player
        const playersForNextIndex = playerOrder.map(id => ({
          id,
          name: '',
          hand: [],
          faceUp: [],
          faceDown: [],
          isAI: false,
          isOut: removedPlayers.includes(id) || (playersData[id]?.isOut as boolean)
        }));
        currentIndex = getNextPlayerIndex(currentIndex, playersForNextIndex);

        const turnNow = Timestamp.now();
        const turnExpiresAt = Timestamp.fromMillis(turnNow.toMillis() + TURN_TIMEOUT_SECONDS * 1000);

        updates.currentPlayerIndex = currentIndex;
        updates.turnState = {
          playerId: playerOrder[currentIndex],
          startedAt: turnNow,
          expiresAt: turnExpiresAt,
          phase: 'play'
        };
      }

      transaction.update(gameRef, updates);
      return { removed: removedPlayers, gameEnded: false };
    });
  } catch (error) {
    console.error('Error removing disconnected players:', error);
    return { removed: [], gameEnded: false };
  }
}

// Helper: Serialize game players for Firestore
function serializeGamePlayers(players: Record<string, OnlineGamePlayer>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {};

  for (const [playerId, player] of Object.entries(players)) {
    serialized[playerId] = {
      displayName: player.displayName,
      hand: serializeCards(player.hand),
      faceUp: serializeCards(player.faceUp),
      faceDown: serializeCards(player.faceDown),
      isOut: player.isOut,
      connectionStatus: player.connectionStatus,
      lastPingAt: serverTimestamp(),
      timeoutsThisGame: player.timeoutsThisGame,
      swapConfirmed: player.swapConfirmed
    };
  }

  return serialized;
}

// Helper: Convert Firestore document to OnlineGame
function docToGame(id: string, data: Record<string, unknown>): OnlineGame {
  const players: Record<string, OnlineGamePlayer> = {};
  const playersData = data.players as Record<string, Record<string, unknown>> || {};

  for (const [playerId, playerData] of Object.entries(playersData)) {
    players[playerId] = {
      displayName: playerData.displayName as string,
      hand: deserializeCards((playerData.hand as SerializedCard[]) || []),
      faceUp: deserializeCards((playerData.faceUp as SerializedCard[]) || []),
      faceDown: deserializeCards((playerData.faceDown as SerializedCard[]) || []),
      isOut: playerData.isOut as boolean,
      connectionStatus: playerData.connectionStatus as 'connected' | 'disconnected',
      lastPingAt: (playerData.lastPingAt as Timestamp)?.toDate() || new Date(),
      timeoutsThisGame: playerData.timeoutsThisGame as number || 0,
      swapConfirmed: playerData.swapConfirmed as boolean || false
    };
  }

  const turnStateData = data.turnState as Record<string, unknown> || {};
  const turnState: TurnState = {
    playerId: turnStateData.playerId as string,
    startedAt: (turnStateData.startedAt as Timestamp)?.toDate() || new Date(),
    expiresAt: (turnStateData.expiresAt as Timestamp)?.toDate() || new Date(),
    phase: turnStateData.phase as 'swap' | 'play'
  };

  let swapPhase = null;
  if (data.swapPhase) {
    const swapData = data.swapPhase as Record<string, unknown>;
    swapPhase = {
      startedAt: (swapData.startedAt as Timestamp)?.toDate() || new Date(),
      expiresAt: (swapData.expiresAt as Timestamp)?.toDate() || new Date(),
      confirmedPlayers: (swapData.confirmedPlayers as string[]) || []
    };
  }

  return {
    id,
    lobbyId: data.lobbyId as string,
    status: data.status as 'swapping' | 'playing' | 'ended',
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
    playerOrder: (data.playerOrder as string[]) || [],
    players,
    deckCount: data.deckCount as number || 1,
    deckEmpty: data.deckEmpty as boolean ?? false,
    discardPile: deserializeCards((data.discardPile as SerializedCard[]) || []),
    burnPile: deserializeCards((data.burnPile as SerializedCard[]) || []),
    currentPlayerIndex: data.currentPlayerIndex as number || 0,
    turnState,
    swapPhase,
    loserId: data.loserId as string | null,
    reactions: ((data.reactions as Array<Record<string, unknown>>) || []).map(r => ({
      playerId: r.playerId as string,
      emoji: r.emoji as EmojiReaction,
      timestamp: (r.timestamp as Timestamp)?.toDate() || new Date()
    }))
  };
}
