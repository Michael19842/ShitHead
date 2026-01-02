import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Lobby, LobbyPlayer, LobbyType } from '@/types';
import {
  createLobby,
  getLobby,
  getLobbyByCode,
  joinLobby,
  leaveLobby,
  setPlayerReady,
  subscribeLobby,
  findAvailableLobbies,
  deleteLobby
} from '@/services/firebase/lobbyService';
import { setPlayerCurrentLobby } from '@/services/firebase/playerService';
import { useAuthStore } from './authStore';

export const useLobbyStore = defineStore('lobby', () => {
  // State
  const currentLobby = ref<Lobby | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Private state
  let unsubscribe: (() => void) | null = null;

  // Getters
  const lobbyId = computed(() => currentLobby.value?.id || null);
  const lobbyCode = computed(() => currentLobby.value?.code || null);
  const isHost = computed(() => {
    const authStore = useAuthStore();
    return currentLobby.value?.hostPlayerId === authStore.playerId;
  });

  const players = computed(() => {
    if (!currentLobby.value) return [];
    return Object.values(currentLobby.value.players).sort((a, b) => {
      // Host first, then by join time
      if (a.isHost) return -1;
      if (b.isHost) return 1;
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });
  });

  const playerCount = computed(() => players.value.length);

  const targetPlayerCount = computed(() => currentLobby.value?.targetPlayerCount || 2);

  const isFull = computed(() => playerCount.value >= targetPlayerCount.value);

  const allReady = computed(() => {
    if (players.value.length < 2) return false;
    return players.value.every(p => p.ready || p.isHost);
  });

  const canStart = computed(() => {
    return isHost.value && isFull.value && allReady.value;
  });

  const myPlayer = computed(() => {
    const authStore = useAuthStore();
    if (!currentLobby.value || !authStore.playerId) return null;
    return currentLobby.value.players[authStore.playerId] || null;
  });

  const isReady = computed(() => myPlayer.value?.ready || false);

  // Actions

  // Create a new lobby
  async function create(type: LobbyType, targetPlayers: number): Promise<string | null> {
    const authStore = useAuthStore();
    if (!authStore.playerId || !authStore.playerName) {
      error.value = 'Niet ingelogd';
      return null;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const lobby = await createLobby(
        authStore.playerId,
        authStore.playerName,
        type,
        targetPlayers
      );

      // Update player's current lobby
      await setPlayerCurrentLobby(authStore.playerId, lobby.id);

      // Subscribe to lobby updates
      subscribeToLobby(lobby.id);

      return lobby.id;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Kon lobby niet aanmaken';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  // Join a lobby by ID - returns lobbyId on success, null on failure
  async function join(lobbyId: string): Promise<string | null> {
    const authStore = useAuthStore();
    if (!authStore.playerId || !authStore.playerName) {
      error.value = 'Niet ingelogd';
      return null;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const result = await joinLobby(lobbyId, authStore.playerId, authStore.playerName);

      if (!result.success) {
        error.value = result.error || 'Kon niet joinen';
        return null;
      }

      // Update player's current lobby
      await setPlayerCurrentLobby(authStore.playerId, lobbyId);

      // Subscribe to lobby updates (async, will update currentLobby later)
      subscribeToLobby(lobbyId);

      // Return the lobbyId directly - don't wait for subscription
      return lobbyId;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Kon niet joinen';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  // Join a lobby by code
  async function joinByCode(code: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const lobby = await getLobbyByCode(code);

      if (!lobby) {
        error.value = 'Lobby niet gevonden';
        return false;
      }

      const result = await join(lobby.id);
      return result !== null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Kon niet joinen';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Leave current lobby
  async function leave(): Promise<void> {
    const authStore = useAuthStore();
    if (!currentLobby.value || !authStore.playerId) return;

    const lobbyId = currentLobby.value.id;

    // Unsubscribe first
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    try {
      await leaveLobby(lobbyId, authStore.playerId);
      await setPlayerCurrentLobby(authStore.playerId, null);
    } catch (err) {
      console.error('Error leaving lobby:', err);
    }

    currentLobby.value = null;
  }

  // Toggle ready status
  async function toggleReady(): Promise<void> {
    const authStore = useAuthStore();
    if (!currentLobby.value || !authStore.playerId) return;

    try {
      await setPlayerReady(
        currentLobby.value.id,
        authStore.playerId,
        !isReady.value
      );
    } catch (err) {
      console.error('Error toggling ready:', err);
    }
  }

  // Find and join a random lobby - returns lobbyId on success
  async function findAndJoinRandom(targetPlayers: number): Promise<string | null> {
    isLoading.value = true;
    error.value = null;

    try {
      console.log('[Matchmaking] Looking for lobbies with', targetPlayers, 'players');
      const lobbies = await findAvailableLobbies(targetPlayers);
      console.log('[Matchmaking] Found lobbies:', lobbies.length);

      if (lobbies.length > 0) {
        // Join the first available lobby
        console.log('[Matchmaking] Joining lobby:', lobbies[0].id);
        const lobbyId = await join(lobbies[0].id);
        if (lobbyId) {
          console.log('[Matchmaking] Joined lobby:', lobbyId);
          return lobbyId;
        }
      }

      // No available lobbies, create one
      console.log('[Matchmaking] Creating new lobby');
      const lobbyId = await create('random', targetPlayers);
      console.log('[Matchmaking] Created lobby:', lobbyId);
      return lobbyId;
    } catch (err) {
      console.error('[Matchmaking] Error:', err);
      error.value = err instanceof Error ? err.message : 'Matchmaking mislukt';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  // Subscribe to lobby updates
  function subscribeToLobby(lobbyId: string): void {
    // Unsubscribe from previous lobby
    if (unsubscribe) {
      unsubscribe();
    }

    console.log('[LobbyStore] Subscribing to lobby:', lobbyId);
    unsubscribe = subscribeLobby(lobbyId, (lobby) => {
      console.log('[LobbyStore] Received lobby update:', lobby?.id, lobby);
      if (!lobby) {
        // Lobby was deleted
        currentLobby.value = null;
        error.value = 'Lobby is gesloten';
        return;
      }

      currentLobby.value = lobby;

      // Check if we were kicked
      const authStore = useAuthStore();
      if (authStore.playerId && !lobby.players[authStore.playerId]) {
        currentLobby.value = null;
        error.value = 'Je bent uit de lobby verwijderd';
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      }
    });
  }

  // Rejoin a lobby (e.g., after app restart)
  async function rejoin(lobbyId: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const lobby = await getLobby(lobbyId);

      if (!lobby || lobby.status !== 'waiting') {
        error.value = 'Lobby is niet meer beschikbaar';
        return false;
      }

      const authStore = useAuthStore();
      if (!authStore.playerId) {
        error.value = 'Niet ingelogd';
        return false;
      }

      // Check if we're still in the lobby
      if (!lobby.players[authStore.playerId]) {
        error.value = 'Je zit niet meer in deze lobby';
        return false;
      }

      // Subscribe to lobby updates
      subscribeToLobby(lobbyId);

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Kon niet reconnecten';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Cleanup
  function cleanup(): void {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    currentLobby.value = null;
    error.value = null;
  }

  // Clear error
  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    currentLobby,
    isLoading,
    error,

    // Getters
    lobbyId,
    lobbyCode,
    isHost,
    players,
    playerCount,
    targetPlayerCount,
    isFull,
    allReady,
    canStart,
    myPlayer,
    isReady,

    // Actions
    create,
    join,
    joinByCode,
    leave,
    toggleReady,
    findAndJoinRandom,
    rejoin,
    cleanup,
    clearError
  };
});
