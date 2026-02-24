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
} from '@/services/supabase/lobbyService';
import { setPlayerCurrentLobby } from '@/services/supabase/playerService';
import { useAuthStore } from './authStore';

export const useLobbyStore = defineStore('lobby', () => {
  const currentLobby = ref<Lobby | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  let unsubscribe: (() => void) | null = null;

  const lobbyId = computed(() => currentLobby.value?.id || null);
  const lobbyCode = computed(() => currentLobby.value?.code || null);
  const isHost = computed(() => {
    const authStore = useAuthStore();
    return currentLobby.value?.hostPlayerId === authStore.playerId;
  });

  const players = computed(() => {
    if (!currentLobby.value) return [];
    return Object.values(currentLobby.value.players).sort((a, b) => {
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
  const canStart = computed(() => isHost.value && isFull.value && allReady.value);
  const myPlayer = computed(() => {
    const authStore = useAuthStore();
    if (!currentLobby.value || !authStore.playerId) return null;
    return currentLobby.value.players[authStore.playerId] || null;
  });
  const isReady = computed(() => myPlayer.value?.ready || false);

  async function create(type: LobbyType, targetPlayers: number): Promise<string | null> {
    const authStore = useAuthStore();
    if (!authStore.playerId || !authStore.playerName) {
      error.value = 'Niet ingelogd';
      return null;
    }
    isLoading.value = true;
    error.value = null;
    try {
      const lobby = await createLobby(authStore.playerId, authStore.playerName, type, targetPlayers);
      await setPlayerCurrentLobby(authStore.playerId, lobby.id);
      subscribeToLobby(lobby.id);
      return lobby.id;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Kon lobby niet aanmaken';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

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
      await setPlayerCurrentLobby(authStore.playerId, lobbyId);
      subscribeToLobby(lobbyId);
      return lobbyId;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Kon niet joinen';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

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

  async function leave(): Promise<void> {
    const authStore = useAuthStore();
    if (!currentLobby.value || !authStore.playerId) return;
    const lobbyIdVal = currentLobby.value.id;
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    try {
      await leaveLobby(lobbyIdVal, authStore.playerId);
      await setPlayerCurrentLobby(authStore.playerId, null);
    } catch (err) {
      console.error('Error leaving lobby:', err);
    }
    currentLobby.value = null;
  }

  async function toggleReady(): Promise<void> {
    const authStore = useAuthStore();
    if (!currentLobby.value || !authStore.playerId) return;
    try {
      await setPlayerReady(currentLobby.value.id, authStore.playerId, !isReady.value);
    } catch (err) {
      console.error('Error toggling ready:', err);
    }
  }

  async function findAndJoinRandom(targetPlayers: number): Promise<string | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const lobbies = await findAvailableLobbies(targetPlayers);
      if (lobbies.length > 0) {
        const lobbyIdVal = await join(lobbies[0].id);
        if (lobbyIdVal) return lobbyIdVal;
      }
      const lobbyIdVal = await create('random', targetPlayers);
      return lobbyIdVal;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Matchmaking mislukt';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  function subscribeToLobby(lobbyIdVal: string): void {
    if (unsubscribe) unsubscribe();
    unsubscribe = subscribeLobby(lobbyIdVal, (lobby) => {
      if (!lobby) {
        currentLobby.value = null;
        error.value = 'Lobby is gesloten';
        return;
      }
      currentLobby.value = lobby;
      const authStore = useAuthStore();
      if (authStore.playerId && !lobby.players[authStore.playerId]) {
        currentLobby.value = null;
        error.value = 'Je bent uit de lobby verwijderd';
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }
      }
    });
  }

  async function rejoin(lobbyIdVal: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const lobby = await getLobby(lobbyIdVal);
      if (!lobby || lobby.status !== 'waiting') {
        error.value = 'Lobby is niet meer beschikbaar';
        return false;
      }
      const authStore = useAuthStore();
      if (!authStore.playerId) {
        error.value = 'Niet ingelogd';
        return false;
      }
      if (!lobby.players[authStore.playerId]) {
        error.value = 'Je zit niet meer in deze lobby';
        return false;
      }
      subscribeToLobby(lobbyIdVal);
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Kon niet reconnecten';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  function cleanup(): void {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    currentLobby.value = null;
    error.value = null;
  }

  function clearError(): void {
    error.value = null;
  }

  return {
    currentLobby, isLoading, error,
    lobbyId, lobbyCode, isHost, players, playerCount, targetPlayerCount, isFull, allReady, canStart, myPlayer, isReady,
    create, join, joinByCode, leave, toggleReady, findAndJoinRandom, rejoin, cleanup, clearError
  };
});
