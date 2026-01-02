import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Card, OnlineGame, OnlineGamePlayer, EmojiReaction, Player } from '@/types';
import { PlayerPhase } from '@/types';
import {
  getGame,
  subscribeToGame,
  confirmSwap,
  swapCards as gameSwapCards,
  playCards,
  pickupPile,
  playBlindCard,
  sendReaction,
  updateConnectionStatus,
  handleTurnTimeout,
  createBan,
  removeDisconnectedPlayers
} from '@/services/firebase/gameService';
import { canPlayCards, getPlayerPhase } from '@/services/gameEngine';
import { useAuthStore } from './authStore';

export const useMultiplayerStore = defineStore('multiplayer', () => {
  // State
  const currentGame = ref<OnlineGame | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const selectedCards = ref<Card[]>([]);

  // Private
  let unsubscribe: (() => void) | null = null;

  // Getters
  const gameId = computed(() => currentGame.value?.id || null);
  const status = computed(() => currentGame.value?.status || null);
  const isSwapping = computed(() => status.value === 'swapping');
  const isPlaying = computed(() => status.value === 'playing');
  const isEnded = computed(() => status.value === 'ended');

  const myPlayerId = computed(() => {
    const authStore = useAuthStore();
    return authStore.playerId;
  });

  const myPlayer = computed((): OnlineGamePlayer | null => {
    if (!currentGame.value || !myPlayerId.value) return null;
    return currentGame.value.players[myPlayerId.value] || null;
  });

  const currentPlayerId = computed(() => {
    if (!currentGame.value) return null;
    return currentGame.value.playerOrder[currentGame.value.currentPlayerIndex];
  });

  const isMyTurn = computed(() => {
    return currentPlayerId.value === myPlayerId.value;
  });

  const currentPlayer = computed((): OnlineGamePlayer | null => {
    if (!currentGame.value || !currentPlayerId.value) return null;
    return currentGame.value.players[currentPlayerId.value] || null;
  });

  const turnExpiresAt = computed(() => currentGame.value?.turnState.expiresAt || null);
  const swapExpiresAt = computed(() => currentGame.value?.swapPhase?.expiresAt || null);

  const discardPile = computed(() => currentGame.value?.discardPile || []);
  const burnPile = computed(() => currentGame.value?.burnPile || []);
  const deckEmpty = computed(() => currentGame.value?.deckEmpty ?? false);

  // Create a placeholder deck array for CardPile component (we don't expose actual cards)
  // Show some cards when deck is not empty, empty array when empty
  const deck = computed((): Card[] => {
    if (deckEmpty.value) return [];
    // Show placeholder cards (just for visual)
    return Array.from({ length: 5 }, (_, i) => ({
      id: `deck-${i}`,
      suit: 'spades' as const,
      rank: 0
    }));
  });

  const topCard = computed(() => {
    const pile = discardPile.value;
    return pile.length > 0 ? pile[pile.length - 1] : null;
  });

  // Check if a 7 is active (next card must be 7 or lower)
  const isSevenActive = computed(() => {
    const pile = discardPile.value;
    if (pile.length === 0) return false;

    // Find effective top card (skip 3s which are glass)
    for (let i = pile.length - 1; i >= 0; i--) {
      if (pile[i].rank !== 3) {
        return pile[i].rank === 7;
      }
    }
    return false;
  });

  // Get players in display order (me at bottom)
  const players = computed(() => {
    if (!currentGame.value) return [];

    return currentGame.value.playerOrder.map(id => ({
      id,
      ...currentGame.value!.players[id],
      isCurrent: id === currentPlayerId.value,
      isMe: id === myPlayerId.value
    }));
  });

  const opponents = computed(() => {
    return players.value.filter(p => p.id !== myPlayerId.value);
  });

  // Convert to local Player format for existing components
  const playersAsLocal = computed((): Player[] => {
    if (!currentGame.value) return [];

    return currentGame.value.playerOrder.map(id => {
      const p = currentGame.value!.players[id];
      const isMe = id === myPlayerId.value;

      return {
        id,
        name: p.displayName,
        // Only show own cards, hide others' hands
        hand: isMe ? p.hand : p.hand.map(() => ({ suit: 'spades', rank: 0, id: '' } as Card)),
        faceUp: p.faceUp,
        faceDown: p.faceDown,
        isAI: false,
        isOut: p.isOut
      };
    });
  });

  const canPlaySelected = computed(() => {
    if (!isMyTurn.value || selectedCards.value.length === 0) return false;
    return canPlayCards(selectedCards.value, discardPile.value);
  });

  const canPickup = computed(() => {
    return isMyTurn.value && discardPile.value.length > 0;
  });

  const mySwapConfirmed = computed(() => {
    if (!currentGame.value?.swapPhase || !myPlayerId.value) return false;
    return currentGame.value.swapPhase.confirmedPlayers.includes(myPlayerId.value);
  });

  const loser = computed(() => {
    if (!currentGame.value?.loserId) return null;
    const loserId = currentGame.value.loserId;
    return {
      id: loserId,
      name: currentGame.value.players[loserId]?.displayName || 'Unknown'
    };
  });

  const reactions = computed(() => currentGame.value?.reactions || []);

  // Determine current player phase (HAND, FACE_UP, or FACE_DOWN)
  const myPlayerPhase = computed(() => {
    if (!myPlayer.value) return PlayerPhase.HAND;
    // Use the deckEmpty field from the game state
    const deckEmpty = currentGame.value?.deckEmpty ?? false;
    return getPlayerPhase(
      {
        id: myPlayerId.value || '',
        name: myPlayer.value.displayName,
        hand: myPlayer.value.hand,
        faceUp: myPlayer.value.faceUp,
        faceDown: myPlayer.value.faceDown,
        isAI: false,
        isOut: myPlayer.value.isOut
      },
      deckEmpty
    );
  });

  const playerNames = computed(() => {
    if (!currentGame.value) return {};
    const names: Record<string, string> = {};
    for (const [id, player] of Object.entries(currentGame.value.players)) {
      names[id] = player.displayName;
    }
    return names;
  });

  // Actions

  // Subscribe to a game
  async function joinGame(gameId: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      // First fetch the game
      const game = await getGame(gameId);
      if (!game) {
        error.value = 'Game not found';
        return false;
      }

      // Check if player is part of this game
      const authStore = useAuthStore();
      if (!authStore.playerId || !game.players[authStore.playerId]) {
        error.value = 'You are not part of this game';
        return false;
      }

      // Subscribe to updates
      subscribeToGameUpdates(gameId);

      // Update connection status
      await updateConnectionStatus(gameId, authStore.playerId, 'connected');

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to join game';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  function subscribeToGameUpdates(gameId: string): void {
    if (unsubscribe) {
      unsubscribe();
    }

    unsubscribe = subscribeToGame(gameId, (game) => {
      currentGame.value = game;

      if (!game) {
        error.value = 'Game was deleted';
      }
    });
  }

  // Confirm swap phase complete
  async function confirmSwapPhase(): Promise<void> {
    if (!gameId.value || !myPlayerId.value) return;

    try {
      await confirmSwap(gameId.value, myPlayerId.value);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to confirm';
    }
  }

  // Swap cards during swap phase
  async function swapCards(handCard: Card, faceUpCard: Card): Promise<void> {
    if (!gameId.value || !myPlayerId.value) return;

    try {
      await gameSwapCards(gameId.value, myPlayerId.value, handCard, faceUpCard);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to swap';
    }
  }

  // Select a card
  function selectCard(card: Card): void {
    const index = selectedCards.value.findIndex(c => c.id === card.id);

    if (index !== -1) {
      // Deselect
      selectedCards.value.splice(index, 1);
    } else {
      // Select (only if same rank or empty selection)
      if (selectedCards.value.length === 0 || selectedCards.value[0].rank === card.rank) {
        selectedCards.value.push(card);
      } else {
        // Replace selection with new card
        selectedCards.value = [card];
      }
    }
  }

  function clearSelection(): void {
    selectedCards.value = [];
  }

  // Play selected cards
  async function playSelectedCards(): Promise<{ success: boolean; burned?: boolean }> {
    if (!gameId.value || !myPlayerId.value || !canPlaySelected.value) {
      return { success: false };
    }

    const cards = [...selectedCards.value];
    clearSelection();

    try {
      const result = await playCards(gameId.value, myPlayerId.value, cards);
      if (!result.success) {
        error.value = result.error || 'Failed to play cards';
      }
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to play';
      return { success: false };
    }
  }

  // Pickup pile
  async function pickup(): Promise<boolean> {
    if (!gameId.value || !myPlayerId.value || !canPickup.value) {
      return false;
    }

    try {
      const result = await pickupPile(gameId.value, myPlayerId.value);
      if (!result.success) {
        error.value = result.error || 'Failed to pickup';
      }
      return result.success;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to pickup';
      return false;
    }
  }

  // Play blind card
  async function playBlind(index: number): Promise<{ success: boolean; card?: Card; mustPickup?: boolean; burned?: boolean }> {
    if (!gameId.value || !myPlayerId.value) {
      return { success: false };
    }

    try {
      const result = await playBlindCard(gameId.value, myPlayerId.value, index);
      if (!result.success) {
        error.value = result.error || 'Failed to play blind card';
      }
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to play';
      return { success: false };
    }
  }

  // Send reaction
  async function react(emoji: EmojiReaction): Promise<void> {
    if (!gameId.value || !myPlayerId.value) return;

    try {
      await sendReaction(gameId.value, myPlayerId.value, emoji);
    } catch (err) {
      console.error('Failed to send reaction:', err);
    }
  }

  // Handle turn timeout (auto-pickup)
  async function onTurnTimeout(): Promise<{ banned: boolean }> {
    if (!gameId.value || !myPlayerId.value || !isMyTurn.value) {
      return { banned: false };
    }

    try {
      const result = await handleTurnTimeout(gameId.value, myPlayerId.value);

      if (result.banned) {
        // Create the ban
        await createBan(myPlayerId.value, 5);
        error.value = 'Je bent 5 minuten geblokkeerd wegens inactiviteit';
      }

      return { banned: result.banned || false };
    } catch (err) {
      console.error('Failed to handle timeout:', err);
      return { banned: false };
    }
  }

  // Check and remove disconnected players (after 1 minute)
  async function checkDisconnectedPlayers(): Promise<{ removed: string[]; gameEnded: boolean; winner?: string }> {
    if (!gameId.value) {
      return { removed: [], gameEnded: false };
    }

    try {
      return await removeDisconnectedPlayers(gameId.value);
    } catch (err) {
      console.error('Failed to check disconnected players:', err);
      return { removed: [], gameEnded: false };
    }
  }

  // Leave game (disconnect)
  async function leaveGame(): Promise<void> {
    if (gameId.value && myPlayerId.value) {
      try {
        await updateConnectionStatus(gameId.value, myPlayerId.value, 'disconnected');
      } catch {
        // Ignore errors
      }
    }

    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    currentGame.value = null;
    selectedCards.value = [];
    error.value = null;
  }

  // Cleanup
  function cleanup(): void {
    leaveGame();
  }

  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    currentGame,
    isLoading,
    error,
    selectedCards,

    // Getters
    gameId,
    status,
    isSwapping,
    isPlaying,
    isEnded,
    myPlayerId,
    myPlayer,
    currentPlayerId,
    isMyTurn,
    currentPlayer,
    turnExpiresAt,
    swapExpiresAt,
    discardPile,
    burnPile,
    deckEmpty,
    deck,
    topCard,
    isSevenActive,
    players,
    opponents,
    playersAsLocal,
    canPlaySelected,
    canPickup,
    mySwapConfirmed,
    myPlayerPhase,
    loser,
    reactions,
    playerNames,

    // Actions
    joinGame,
    confirmSwapPhase,
    swapCards,
    selectCard,
    clearSelection,
    playSelectedCards,
    pickup,
    playBlind,
    react,
    onTurnTimeout,
    checkDisconnectedPlayers,
    leaveGame,
    cleanup,
    clearError
  };
});
