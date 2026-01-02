<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="matchmaking-toolbar">
        <ion-buttons slot="start">
          <ion-button @click="cancelMatchmaking">
            <ion-icon :icon="arrowBack" />
          </ion-button>
        </ion-buttons>
        <ion-title>Zoeken...</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="matchmaking-content">
      <div class="matchmaking-container">
        <!-- Searching animation -->
        <div class="search-animation">
          <div class="search-rings">
            <div class="ring ring-1"></div>
            <div class="ring ring-2"></div>
            <div class="ring ring-3"></div>
          </div>
          <div class="search-icon">🔍</div>
        </div>

        <!-- Status text -->
        <div class="status-section">
          <h2 class="status-title">{{ statusTitle }}</h2>
          <p class="status-subtitle">{{ statusSubtitle }}</p>
        </div>

        <!-- Search info -->
        <div class="search-info">
          <div class="info-item">
            <ion-icon :icon="people" />
            <span>{{ playerCount }} spelers</span>
          </div>
          <div class="info-item">
            <ion-icon :icon="time" />
            <span>{{ formatTime(elapsedTime) }}</span>
          </div>
        </div>

        <!-- Cancel button -->
        <ion-button
          expand="block"
          fill="outline"
          color="light"
          @click="cancelMatchmaking"
          class="cancel-button"
        >
          <ion-icon slot="start" :icon="close" />
          Annuleren
        </ion-button>

        <!-- Error message -->
        <transition name="fade">
          <div v-if="error" class="error-message">
            <ion-icon :icon="alertCircle" />
            {{ error }}
          </div>
        </transition>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon
} from '@ionic/vue';
import { arrowBack, people, time, close, alertCircle } from 'ionicons/icons';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useLobbyStore } from '@/stores/lobbyStore';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const route = useRoute();
const lobbyStore = useLobbyStore();
const authStore = useAuthStore();
const { currentLobby } = storeToRefs(lobbyStore);

const playerCount = ref(2);
const elapsedTime = ref(0);
const error = ref<string | null>(null);
const isSearching = ref(true);

let timerInterval: ReturnType<typeof setInterval> | null = null;

const statusTitle = computed(() => {
  if (error.value) return 'Fout';
  if (lobbyStore.currentLobby) return 'Gevonden!';
  return 'Zoeken naar spel...';
});

const statusSubtitle = computed(() => {
  if (error.value) return 'Kon geen spel vinden';
  if (lobbyStore.currentLobby) {
    const count = lobbyStore.playerCount;
    const target = lobbyStore.targetPlayerCount;
    return `${count}/${target} spelers`;
  }
  return 'Even geduld...';
});

onMounted(async () => {
  await authStore.initialize();

  if (!authStore.isRegistered) {
    router.replace('/online/register');
    return;
  }

  // Get player count from query
  playerCount.value = parseInt(route.query.playerCount as string) || 2;

  // Start timer
  timerInterval = setInterval(() => {
    elapsedTime.value++;
  }, 1000);

  // Start matchmaking
  startMatchmaking();
});

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});

// Watch for lobby changes
watch(
  currentLobby,
  (lobby) => {
    console.log('[MatchmakingPage] Watch triggered, lobby:', lobby?.id, 'isSearching:', isSearching.value);
    if (lobby && lobby.id && isSearching.value) {
      console.log('[MatchmakingPage] Redirecting to lobby:', lobby.id);
      isSearching.value = false;
      // Navigate to lobby
      setTimeout(() => {
        router.replace(`/online/lobby/${lobby.id}`);
      }, 500);
    }
  },
  { immediate: true, deep: true }
);

async function startMatchmaking() {
  error.value = null;

  try {
    const lobbyId = await lobbyStore.findAndJoinRandom(playerCount.value);

    console.log('[MatchmakingPage] After findAndJoinRandom, lobbyId:', lobbyId);

    if (lobbyId) {
      console.log('[MatchmakingPage] Join successful, navigating to:', lobbyId);
      isSearching.value = false;
      router.replace(`/online/lobby/${lobbyId}`);
    } else {
      error.value = lobbyStore.error || 'Matchmaking mislukt';
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Onbekende fout';
  }
}

function cancelMatchmaking() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  // Leave lobby if we joined one
  if (lobbyStore.currentLobby) {
    lobbyStore.leave();
  }

  router.replace('/online');
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
</script>

<style scoped>
.matchmaking-toolbar {
  --background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
  --color: white;
}

.matchmaking-content {
  --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.matchmaking-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 2rem;
  gap: 2rem;
}

/* Search animation */
.search-animation {
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-rings {
  position: absolute;
  inset: 0;
}

.ring {
  position: absolute;
  inset: 0;
  border: 3px solid transparent;
  border-top-color: var(--ion-color-primary);
  border-radius: 50%;
  animation: spin 2s linear infinite;
}

.ring-1 {
  animation-duration: 2s;
}

.ring-2 {
  inset: 20px;
  border-top-color: rgba(var(--ion-color-primary-rgb), 0.6);
  animation-duration: 2.5s;
  animation-direction: reverse;
}

.ring-3 {
  inset: 40px;
  border-top-color: rgba(var(--ion-color-primary-rgb), 0.3);
  animation-duration: 3s;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.search-icon {
  font-size: 48px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

/* Status section */
.status-section {
  text-align: center;
}

.status-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin: 0 0 0.5rem 0;
}

.status-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

/* Search info */
.search-info {
  display: flex;
  gap: 2rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.95rem;
}

.info-item ion-icon {
  font-size: 20px;
}

/* Cancel button */
.cancel-button {
  width: 100%;
  max-width: 300px;
  --border-radius: 12px;
  --border-width: 2px;
  font-weight: 500;
  height: 48px;
}

/* Error message */
.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.5);
  border-radius: 12px;
  color: #ff8a80;
  max-width: 300px;
  text-align: center;
}

.error-message ion-icon {
  font-size: 20px;
  flex-shrink: 0;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
