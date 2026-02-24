import { getSupabase } from '@/supabase';
import { serializeCards, deserializeCards, type SerializedCard } from '@/supabase/converters';
import type { Card, OnlineGame, OnlineGamePlayer, TurnState, EmojiReaction, Lobby } from '@/types';
import { createDeck, shuffleDeck } from '@/services/deckService';
import { canPlayCards, willCauseBurn, getNextPlayerIndex, getStartingPlayerAndCards } from '@/services/gameEngine';
import type { Player } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  const supabase = getSupabase();

  // First fetch the lobby
  const { data: lobbyData, error: lobbyError } = await supabase
    .from('lobbies')
    .select('*')
    .eq('id', lobbyId)
    .single();

  if (lobbyError || !lobbyData) {
    throw new Error('Lobby not found');
  }

  const lobby = lobbyData as unknown as { players: Record<string, { displayName: string }> };

  // Create and shuffle deck
  const playerCount = Object.keys(lobby.players).length;
  const deckCount = playerCount <= 4 ? 1 : 2;
  let deck = deckCount === 1 ? createDeck() : [...createDeck(), ...createDeck()];
  deck = shuffleDeck(deck);

  // Deal cards to players
  const playerOrder = Object.keys(lobby.players);
  const players: Record<string, OnlineGamePlayer> = {};

  const now = new Date();

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
      lastPingAt: now,
      timeoutsThisGame: 0,
      swapConfirmed: false
    };
  }

  const swapExpiresAt = new Date(now.getTime() + SWAP_TIMEOUT_SECONDS * 1000);

  const gameData = {
    lobby_id: lobbyId,
    status: 'swapping',
    player_order: playerOrder,
    players: serializeGamePlayers(players),
    deck: serializeCards(deck),
    deck_count: deckCount,
    deck_empty: false,
    discard_pile: [],
    burn_pile: [],
    current_player_index: 0,
    turn_state: {
      playerId: playerOrder[0],
      startedAt: now.toISOString(),
      expiresAt: swapExpiresAt.toISOString(),
      phase: 'swap'
    },
    swap_phase: {
      startedAt: now.toISOString(),
      expiresAt: swapExpiresAt.toISOString(),
      confirmedPlayers: []
    },
    loser_id: null,
    reactions: []
  };

  const { data: gameResult, error: gameError } = await supabase
    .from('games')
    .insert(gameData)
    .select()
    .single();

  if (gameError || !gameResult) {
    throw new Error(`Failed to create game: ${gameError?.message}`);
  }

  // Update lobby with game ID and status
  await supabase
    .from('lobbies')
    .update({
      status: 'in_game',
      game_id: gameResult.id
    })
    .eq('id', lobbyId);

  return gameResult.id;
}

// Get game by ID
export async function getGame(gameId: string): Promise<OnlineGame | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (error || !data) {
    return null;
  }

  return docToGame(data);
}

// Subscribe to game updates
export function subscribeToGame(
  gameId: string,
  callback: (game: OnlineGame | null) => void
): () => void {
  const supabase = getSupabase();

  // First fetch the current state
  getGame(gameId).then(callback);

  // Subscribe to changes
  const channel: RealtimeChannel = supabase
    .channel(`game:${gameId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          callback(null);
        } else if (payload.new) {
          callback(docToGame(payload.new as Record<string, unknown>));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Confirm swap phase (player is ready to play)
export async function confirmSwap(gameId: string, playerId: string): Promise<void> {
  const supabase = getSupabase();

  // Get current game state
  const { data: game, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (error || !game) throw new Error('Game not found');

  const confirmedPlayers = game.swap_phase?.confirmedPlayers || [];

  if (confirmedPlayers.includes(playerId)) return;

  const newConfirmed = [...confirmedPlayers, playerId];

  // Check if all players confirmed
  if (newConfirmed.length === game.player_order.length) {
    // Convert online players to Player format for getStartingPlayerAndCards
    const playerOrder = game.player_order as string[];
    const playersForCalc: Player[] = playerOrder.map(pid => {
      const pd = game.players[pid];
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

    // Start playing phase
    const now = new Date();
    const turnExpiresAt = new Date(now.getTime() + TURN_TIMEOUT_SECONDS * 1000);

    await supabase
      .from('games')
      .update({
        status: 'playing',
        swap_phase: null,
        current_player_index: startingInfo.playerIndex,
        turn_state: {
          playerId: startingPlayerId,
          startedAt: now.toISOString(),
          expiresAt: turnExpiresAt.toISOString(),
          phase: 'play'
        },
        updated_at: now.toISOString()
      })
      .eq('id', gameId);
  } else {
    const players = { ...game.players };
    players[playerId] = { ...players[playerId], swapConfirmed: true };

    await supabase
      .from('games')
      .update({
        swap_phase: {
          ...game.swap_phase,
          confirmedPlayers: newConfirmed
        },
        players,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId);
  }
}

// Swap cards during swap phase
export async function swapCards(
  gameId: string,
  playerId: string,
  handCard: Card,
  faceUpCard: Card
): Promise<void> {
  const supabase = getSupabase();

  const { data: game, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (error || !game) throw new Error('Game not found');
  if (game.status !== 'swapping') throw new Error('Not in swap phase');

  const playerData = game.players[playerId];
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

  const players = { ...game.players };
  players[playerId] = {
    ...players[playerId],
    hand: serializeCards(hand),
    faceUp: serializeCards(faceUp)
  };

  await supabase
    .from('games')
    .update({
      players,
      updated_at: new Date().toISOString()
    })
    .eq('id', gameId);
}

// Play cards
export async function playCards(
  gameId: string,
  playerId: string,
  cards: Card[]
): Promise<{ success: boolean; error?: string; burned?: boolean }> {
  const supabase = getSupabase();

  try {
    const { data: game, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (error || !game) throw new Error('Game not found');
    if (game.status !== 'playing') throw new Error('Game not in playing state');

    // Verify it's this player's turn
    if (game.player_order[game.current_player_index] !== playerId) {
      throw new Error('Not your turn');
    }

    const playerData = game.players[playerId];
    const discardPile = deserializeCards(game.discard_pile || []);

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
    let deck = deserializeCards(game.deck || []);
    while (hand.length < 4 && deck.length > 0) {
      hand.push(deck.pop()!);
    }

    // Update discard pile
    let newDiscardPile = [...discardPile, ...cards];
    let burnPile = deserializeCards(game.burn_pile || []);

    if (burned) {
      burnPile = [...burnPile, ...newDiscardPile];
      newDiscardPile = [];
    }

    // Check if player is out
    const isOut = hand.length === 0 && faceUp.length === 0 && faceDown.length === 0 && deck.length === 0;

    // Determine next player
    let nextPlayerIndex = game.current_player_index;
    if (!burned) {
      nextPlayerIndex = getNextPlayerIndex(game.current_player_index,
        game.player_order.map((id: string) => ({
          isOut: id === playerId ? isOut : game.players[id].isOut
        }))
      );
    }

    // Check for game over
    const activePlayers = game.player_order.filter((id: string) =>
      id === playerId ? !isOut : !game.players[id].isOut
    );
    const gameOver = activePlayers.length <= 1;

    const now = new Date();
    const turnExpiresAt = new Date(now.getTime() + TURN_TIMEOUT_SECONDS * 1000);

    const players = { ...game.players };
    players[playerId] = {
      ...players[playerId],
      hand: serializeCards(hand),
      faceUp: serializeCards(faceUp),
      faceDown: serializeCards(faceDown),
      isOut
    };

    const updates: Record<string, unknown> = {
      players,
      deck: serializeCards(deck),
      deck_empty: deck.length === 0,
      discard_pile: serializeCards(newDiscardPile),
      burn_pile: serializeCards(burnPile),
      current_player_index: nextPlayerIndex,
      turn_state: {
        playerId: game.player_order[nextPlayerIndex],
        startedAt: now.toISOString(),
        expiresAt: turnExpiresAt.toISOString(),
        phase: 'play'
      },
      updated_at: now.toISOString()
    };

    if (gameOver) {
      updates.status = 'ended';
      updates.loser_id = activePlayers[0] || null;
    }

    await supabase
      .from('games')
      .update(updates)
      .eq('id', gameId);

    return { success: true, burned };
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
  const supabase = getSupabase();

  try {
    const { data: game, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (error || !game) throw new Error('Game not found');
    if (game.status !== 'playing') throw new Error('Game not in playing state');

    if (game.player_order[game.current_player_index] !== playerId) {
      throw new Error('Not your turn');
    }

    const playerData = game.players[playerId];
    const discardPile = deserializeCards(game.discard_pile || []);

    if (discardPile.length === 0) {
      throw new Error('No cards to pick up');
    }

    // Add discard pile to hand
    let hand = deserializeCards(playerData.hand);
    hand = [...hand, ...discardPile];

    // Next player
    const nextPlayerIndex = getNextPlayerIndex(game.current_player_index,
      game.player_order.map((id: string) => ({ isOut: game.players[id].isOut }))
    );

    const now = new Date();
    const turnExpiresAt = new Date(now.getTime() + TURN_TIMEOUT_SECONDS * 1000);

    const players = { ...game.players };
    players[playerId] = {
      ...players[playerId],
      hand: serializeCards(hand)
    };

    await supabase
      .from('games')
      .update({
        players,
        discard_pile: [],
        current_player_index: nextPlayerIndex,
        turn_state: {
          playerId: game.player_order[nextPlayerIndex],
          startedAt: now.toISOString(),
          expiresAt: turnExpiresAt.toISOString(),
          phase: 'play'
        },
        updated_at: now.toISOString()
      })
      .eq('id', gameId);

    return { success: true, cardCount: discardPile.length };
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
  const supabase = getSupabase();

  try {
    const { data: game, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (error || !game) throw new Error('Game not found');
    if (game.status !== 'playing') throw new Error('Game not in playing state');

    // Verify it's this player's turn
    if (game.player_order[game.current_player_index] !== playerId) {
      throw new Error('Not your turn');
    }

    // Check if turn has actually expired
    const turnExpiresAt = new Date(game.turn_state.expiresAt).getTime();
    if (Date.now() < turnExpiresAt) {
      throw new Error('Turn has not expired yet');
    }

    const playerData = game.players[playerId];
    const discardPile = deserializeCards(game.discard_pile || []);

    // Increment timeout counter
    const timeoutsThisGame = (playerData.timeoutsThisGame || 0) + 1;
    const shouldBan = timeoutsThisGame >= 3;

    // Add discard pile to hand (if any cards)
    let hand = deserializeCards(playerData.hand);
    if (discardPile.length > 0) {
      hand = [...hand, ...discardPile];
    }

    // Next player
    const nextPlayerIndex = getNextPlayerIndex(game.current_player_index,
      game.player_order.map((id: string) => ({ isOut: game.players[id].isOut }))
    );

    const now = new Date();
    const turnExpiresAtNew = new Date(now.getTime() + TURN_TIMEOUT_SECONDS * 1000);

    const players = { ...game.players };
    players[playerId] = {
      ...players[playerId],
      hand: serializeCards(hand),
      timeoutsThisGame
    };

    await supabase
      .from('games')
      .update({
        players,
        discard_pile: [],
        current_player_index: nextPlayerIndex,
        turn_state: {
          playerId: game.player_order[nextPlayerIndex],
          startedAt: now.toISOString(),
          expiresAt: turnExpiresAtNew.toISOString(),
          phase: 'play'
        },
        updated_at: now.toISOString()
      })
      .eq('id', gameId);

    return { success: true, banned: shouldBan };
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
  gameId: string,
  durationMinutes: number = 5
): Promise<void> {
  const supabase = getSupabase();

  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  await supabase
    .from('bans')
    .upsert({
      player_id: playerId,
      game_id: gameId,
      reason: 'afk_timeout',
      expires_at: expiresAt.toISOString()
    });
}

// Check if player is currently banned
export async function checkBan(playerId: string): Promise<{ banned: boolean; expiresAt?: Date }> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('bans')
    .select('*')
    .eq('player_id', playerId)
    .single();

  if (error || !data) {
    return { banned: false };
  }

  const expiresAt = new Date(data.expires_at);

  if (expiresAt.getTime() < Date.now()) {
    // Ban has expired
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
  const supabase = getSupabase();

  try {
    const { data: game, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (error || !game) throw new Error('Game not found');
    if (game.status !== 'playing') throw new Error('Game not in playing state');

    if (game.player_order[game.current_player_index] !== playerId) {
      throw new Error('Not your turn');
    }

    const playerData = game.players[playerId];
    let faceDown = deserializeCards(playerData.faceDown);

    if (cardIndex < 0 || cardIndex >= faceDown.length) {
      throw new Error('Invalid card index');
    }

    const card = faceDown[cardIndex];
    faceDown.splice(cardIndex, 1);

    const discardPile = deserializeCards(game.discard_pile || []);
    const canPlay = canPlayCards([card], discardPile);

    let hand = deserializeCards(playerData.hand);
    let newDiscardPile = discardPile;
    let burnPile = deserializeCards(game.burn_pile || []);
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
    const faceUp = deserializeCards(playerData.faceUp);
    const deck = deserializeCards(game.deck || []);
    const isOut = hand.length === 0 && faceUp.length === 0 && faceDown.length === 0 && deck.length === 0;

    // Next player
    let nextPlayerIndex = game.current_player_index;
    if (!burned) {
      nextPlayerIndex = getNextPlayerIndex(game.current_player_index,
        game.player_order.map((id: string) => ({
          isOut: id === playerId ? isOut : game.players[id].isOut
        }))
      );
    }

    const now = new Date();
    const turnExpiresAt = new Date(now.getTime() + TURN_TIMEOUT_SECONDS * 1000);

    const players = { ...game.players };
    players[playerId] = {
      ...players[playerId],
      hand: serializeCards(hand),
      faceDown: serializeCards(faceDown),
      isOut
    };

    await supabase
      .from('games')
      .update({
        players,
        discard_pile: serializeCards(newDiscardPile),
        burn_pile: serializeCards(burnPile),
        current_player_index: nextPlayerIndex,
        turn_state: {
          playerId: game.player_order[nextPlayerIndex],
          startedAt: now.toISOString(),
          expiresAt: turnExpiresAt.toISOString(),
          phase: 'play'
        },
        updated_at: now.toISOString()
      })
      .eq('id', gameId);

    return { success: true, card, mustPickup, burned };
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
  const supabase = getSupabase();

  const { data: game } = await supabase
    .from('games')
    .select('reactions')
    .eq('id', gameId)
    .single();

  if (!game) return;

  const reactions = game.reactions || [];
  reactions.push({
    playerId,
    emoji,
    timestamp: new Date().toISOString()
  });

  await supabase
    .from('games')
    .update({ reactions })
    .eq('id', gameId);
}

// Update player connection status
export async function updateConnectionStatus(
  gameId: string,
  playerId: string,
  status: 'connected' | 'disconnected'
): Promise<void> {
  const supabase = getSupabase();

  const { data: game } = await supabase
    .from('games')
    .select('players')
    .eq('id', gameId)
    .single();

  if (!game || !game.players[playerId]) return;

  const players = { ...game.players };
  players[playerId] = {
    ...players[playerId],
    connectionStatus: status,
    lastPingAt: new Date().toISOString()
  };

  await supabase
    .from('games')
    .update({ players })
    .eq('id', gameId);
}

// Remove disconnected players (after 1 minute timeout)
export async function removeDisconnectedPlayers(
  gameId: string
): Promise<{ removed: string[]; gameEnded: boolean; winner?: string }> {
  const supabase = getSupabase();

  try {
    const { data: game, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (error || !game) {
      return { removed: [], gameEnded: false };
    }

    if (game.status !== 'playing') {
      return { removed: [], gameEnded: false };
    }

    const now = Date.now();
    const playersData = game.players || {};
    const playerOrder = game.player_order as string[];
    const removedPlayers: string[] = [];

    // Find players to remove
    for (const playerId of playerOrder) {
      const player = playersData[playerId];
      if (!player || player.isOut) continue;

      const lastPingAt = new Date(player.lastPingAt).getTime();

      if (player.connectionStatus === 'disconnected' && (now - lastPingAt) > DISCONNECT_TIMEOUT_MS) {
        removedPlayers.push(playerId);
      }
    }

    if (removedPlayers.length === 0) {
      return { removed: [], gameEnded: false };
    }

    // Build updates
    const players = { ...playersData };
    let burnPile = deserializeCards(game.burn_pile || []);

    for (const playerId of removedPlayers) {
      const player = playersData[playerId];
      // Add their cards to burn pile
      const hand = deserializeCards(player.hand || []);
      const faceUp = deserializeCards(player.faceUp || []);
      const faceDown = deserializeCards(player.faceDown || []);
      burnPile = [...burnPile, ...hand, ...faceUp, ...faceDown];

      players[playerId] = {
        ...players[playerId],
        isOut: true,
        hand: [],
        faceUp: [],
        faceDown: []
      };
    }

    // Count remaining active players
    const activePlayers = playerOrder.filter(id => {
      if (removedPlayers.includes(id)) return false;
      return !playersData[id]?.isOut;
    });

    const updates: Record<string, unknown> = {
      players,
      burn_pile: serializeCards(burnPile),
      updated_at: new Date().toISOString()
    };

    // Check if game should end
    if (activePlayers.length <= 1) {
      updates.status = 'ended';
      updates.loser_id = null; // No loser - winner by default

      await supabase
        .from('games')
        .update(updates)
        .eq('id', gameId);

      return {
        removed: removedPlayers,
        gameEnded: true,
        winner: activePlayers[0] || undefined
      };
    }

    // If current player was removed, advance to next player
    let currentIndex = game.current_player_index;
    const currentPlayerId = playerOrder[currentIndex];

    if (removedPlayers.includes(currentPlayerId)) {
      // Find next active player
      const playersForNextIndex = playerOrder.map(id => ({
        isOut: removedPlayers.includes(id) || playersData[id]?.isOut
      }));
      currentIndex = getNextPlayerIndex(currentIndex, playersForNextIndex);

      const turnNow = new Date();
      const turnExpiresAt = new Date(turnNow.getTime() + TURN_TIMEOUT_SECONDS * 1000);

      updates.current_player_index = currentIndex;
      updates.turn_state = {
        playerId: playerOrder[currentIndex],
        startedAt: turnNow.toISOString(),
        expiresAt: turnExpiresAt.toISOString(),
        phase: 'play'
      };
    }

    await supabase
      .from('games')
      .update(updates)
      .eq('id', gameId);

    return { removed: removedPlayers, gameEnded: false };
  } catch (error) {
    console.error('Error removing disconnected players:', error);
    return { removed: [], gameEnded: false };
  }
}

// Helper: Serialize game players for database
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
      lastPingAt: player.lastPingAt instanceof Date ? player.lastPingAt.toISOString() : player.lastPingAt,
      timeoutsThisGame: player.timeoutsThisGame,
      swapConfirmed: player.swapConfirmed
    };
  }

  return serialized;
}

// Helper: Convert database row to OnlineGame
function docToGame(data: Record<string, unknown>): OnlineGame {
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
      lastPingAt: new Date(playerData.lastPingAt as string),
      timeoutsThisGame: playerData.timeoutsThisGame as number || 0,
      swapConfirmed: playerData.swapConfirmed as boolean || false
    };
  }

  const turnStateData = data.turn_state as Record<string, unknown> || {};
  const turnState: TurnState = {
    playerId: turnStateData.playerId as string,
    startedAt: new Date(turnStateData.startedAt as string),
    expiresAt: new Date(turnStateData.expiresAt as string),
    phase: turnStateData.phase as 'swap' | 'play'
  };

  let swapPhase = null;
  if (data.swap_phase) {
    const swapData = data.swap_phase as Record<string, unknown>;
    swapPhase = {
      startedAt: new Date(swapData.startedAt as string),
      expiresAt: new Date(swapData.expiresAt as string),
      confirmedPlayers: (swapData.confirmedPlayers as string[]) || []
    };
  }

  return {
    id: data.id as string,
    lobbyId: data.lobby_id as string,
    status: data.status as 'swapping' | 'playing' | 'ended',
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
    playerOrder: (data.player_order as string[]) || [],
    players,
    deckCount: data.deck_count as number || 1,
    deckEmpty: data.deck_empty as boolean ?? false,
    discardPile: deserializeCards((data.discard_pile as SerializedCard[]) || []),
    burnPile: deserializeCards((data.burn_pile as SerializedCard[]) || []),
    currentPlayerIndex: data.current_player_index as number || 0,
    turnState,
    swapPhase,
    loserId: data.loser_id as string | null,
    reactions: ((data.reactions as Array<Record<string, unknown>>) || []).map(r => ({
      playerId: r.playerId as string,
      emoji: r.emoji as EmojiReaction,
      timestamp: new Date(r.timestamp as string)
    }))
  };
}
