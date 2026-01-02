import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { OnlinePlayer } from '@/types';
import {
  getDeviceId,
  signInAnonymouslyWithDevice,
  getPlayerProfile,
  createPlayerProfile,
  findPlayerByDeviceId,
  onAuthStateChange,
  updateLastSeen,
  signOut as authSignOut
} from '@/services/firebase/authService';
import { initializeFirebase } from '@/firebase';

export const useAuthStore = defineStore('auth', () => {
  // State
  const isInitialized = ref(false);
  const isLoading = ref(false);
  const isAuthenticated = ref(false);
  const player = ref<OnlinePlayer | null>(null);
  const error = ref<string | null>(null);
  const deviceId = ref<string | null>(null);

  // Getters
  const playerId = computed(() => player.value?.id || null);
  const playerName = computed(() => player.value?.displayName || null);
  const isRegistered = computed(() => player.value !== null && player.value.displayName !== null);

  // Initialize Firebase and check auth state
  async function initialize(): Promise<void> {
    if (isInitialized.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      // Initialize Firebase
      initializeFirebase();

      // Get device ID
      deviceId.value = await getDeviceId();

      // Check for existing player with this device
      const existingPlayer = await findPlayerByDeviceId(deviceId.value);

      if (existingPlayer) {
        // Sign in and restore session
        await signInAnonymouslyWithDevice();
        player.value = existingPlayer;
        isAuthenticated.value = true;
        await updateLastSeen(existingPlayer.id);
      }

      // Set up auth state listener
      onAuthStateChange((user) => {
        if (!user) {
          isAuthenticated.value = false;
          player.value = null;
        }
      });

      isInitialized.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize';
      console.error('Auth initialization error:', err);
    } finally {
      isLoading.value = false;
    }
  }

  // Register a new player with a display name
  async function register(displayName: string): Promise<boolean> {
    if (!deviceId.value) {
      error.value = 'Device ID not available';
      return false;
    }

    isLoading.value = true;
    error.value = null;

    try {
      // Sign in anonymously first
      const user = await signInAnonymouslyWithDevice();

      // Create player profile
      const newPlayer = await createPlayerProfile(
        user.uid,
        deviceId.value,
        displayName
      );

      player.value = newPlayer;
      isAuthenticated.value = true;

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to register';
      console.error('Registration error:', err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Update player name
  async function updatePlayerName(newName: string): Promise<boolean> {
    if (!player.value) {
      error.value = 'Not authenticated';
      return false;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { getFirebaseDb } = await import('@/firebase');

      const db = getFirebaseDb();
      const playerRef = doc(db, 'players', player.value.id);

      await updateDoc(playerRef, {
        displayName: newName
      });

      player.value = { ...player.value, displayName: newName };
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update name';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Refresh player data from Firestore
  async function refreshPlayer(): Promise<void> {
    if (!player.value) return;

    try {
      const updatedPlayer = await getPlayerProfile(player.value.id);
      if (updatedPlayer) {
        player.value = updatedPlayer;
      }
    } catch (err) {
      console.error('Failed to refresh player:', err);
    }
  }

  // Sign out
  async function signOut(): Promise<void> {
    try {
      await authSignOut();
      player.value = null;
      isAuthenticated.value = false;
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }

  // Clear error
  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    isInitialized,
    isLoading,
    isAuthenticated,
    player,
    error,
    deviceId,

    // Getters
    playerId,
    playerName,
    isRegistered,

    // Actions
    initialize,
    register,
    updatePlayerName,
    refreshPlayer,
    signOut,
    clearError
  };
});
