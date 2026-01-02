<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="game-over-toolbar">
        <ion-title>Spel Afgelopen</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="game-over-content">
      <div class="game-over-container">
        <!-- Loading state -->
        <div v-if="isLoading" class="loading-state">
          <ion-spinner name="crescent" />
          <p>Resultaten laden...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="error-state">
          <div class="error-icon">😕</div>
          <p>{{ error }}</p>
          <ion-button @click="router.replace('/online')">
            Terug naar menu
          </ion-button>
        </div>

        <!-- Results -->
        <template v-else-if="gameData">
          <!-- Trophy/Poop animation -->
          <div class="trophy-section">
            <div class="trophy-icon">💩</div>
            <h1 class="title">Shithead!</h1>
          </div>

          <!-- Loser announcement -->
          <div class="loser-section" v-if="loser">
            <div class="loser-card">
              <div class="loser-avatar">{{ getInitials(loser.displayName) }}</div>
              <div class="loser-info">
                <span class="loser-name">{{ loser.displayName }}</span>
                <span class="loser-title">is de Shithead!</span>
              </div>
            </div>
          </div>

          <!-- Player rankings -->
          <div class="rankings-section">
            <h3>Resultaten</h3>
            <div class="rankings-list">
              <div
                v-for="(player, index) in sortedPlayers"
                :key="player.id"
                class="ranking-item"
                :class="{ 'is-loser': player.id === gameData.loserId, 'is-me': player.id === authStore.playerId }"
              >
                <span class="rank">{{ index + 1 }}</span>
                <span class="player-name">{{ player.displayName }}</span>
                <span v-if="player.id === authStore.playerId" class="you-badge">Jij</span>
                <span v-if="player.id === gameData.loserId" class="loser-badge">💩</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="actions-section">
            <ion-button
              expand="block"
              size="large"
              color="primary"
              @click="playAgain"
              class="play-again-button"
            >
              <ion-icon slot="start" :icon="refreshOutline" />
              Opnieuw Spelen
            </ion-button>

            <ion-button
              expand="block"
              fill="outline"
              color="light"
              @click="goToMenu"
              class="menu-button"
            >
              <ion-icon slot="start" :icon="homeOutline" />
              Terug naar Menu
            </ion-button>
          </div>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonIcon, IonSpinner
} from '@ionic/vue';
import { refreshOutline, homeOutline } from 'ionicons/icons';
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { getGame } from '@/services/firebase/gameService';
import type { OnlineGame, OnlineGamePlayer } from '@/types';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isLoading = ref(true);
const error = ref<string | null>(null);
const gameData = ref<OnlineGame | null>(null);

const loser = computed(() => {
  if (!gameData.value?.loserId) return null;
  return gameData.value.players[gameData.value.loserId];
});

const sortedPlayers = computed(() => {
  if (!gameData.value) return [];

  const players: (OnlineGamePlayer & { id: string })[] = [];

  for (const id of gameData.value.playerOrder) {
    players.push({
      id,
      ...gameData.value.players[id]
    });
  }

  // Sort: non-losers first (by order they went out), loser last
  return players.sort((a, b) => {
    if (a.id === gameData.value?.loserId) return 1;
    if (b.id === gameData.value?.loserId) return -1;
    // Both are out or both are not - maintain original order
    if (a.isOut && !b.isOut) return -1;
    if (!a.isOut && b.isOut) return 1;
    return 0;
  });
});

onMounted(async () => {
  await authStore.initialize();

  const gameId = route.params.gameId as string;

  if (!gameId) {
    error.value = 'Geen spel ID gevonden';
    isLoading.value = false;
    return;
  }

  try {
    const game = await getGame(gameId);

    if (!game) {
      error.value = 'Spel niet gevonden';
    } else if (game.status !== 'ended') {
      // Game is still in progress, go back to game
      router.replace(`/online/game/${gameId}`);
      return;
    } else {
      gameData.value = game;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fout bij laden resultaten';
  }

  isLoading.value = false;
});

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function playAgain() {
  // Go to matchmaking with same player count
  const playerCount = gameData.value?.playerOrder.length || 2;
  router.replace(`/online/matchmaking?playerCount=${playerCount}`);
}

function goToMenu() {
  router.replace('/online');
}
</script>

<style scoped>
.game-over-toolbar {
  --background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
  --color: white;
}

.game-over-content {
  --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.game-over-container {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 1.5rem;
  gap: 1.5rem;
}

/* Loading & Error states */
.loading-state,
.error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.8);
}

.error-icon {
  font-size: 64px;
}

/* Trophy section */
.trophy-section {
  text-align: center;
  padding: 1rem 0;
}

.trophy-icon {
  font-size: 80px;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

.title {
  font-size: 2.5rem;
  font-weight: 800;
  color: white;
  margin: 0.5rem 0 0 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

/* Loser section */
.loser-section {
  display: flex;
  justify-content: center;
}

.loser-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(244, 67, 54, 0.2);
  border: 2px solid rgba(244, 67, 54, 0.5);
  border-radius: 16px;
}

.loser-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #F44336 0%, #D32F2F 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 18px;
  color: white;
}

.loser-info {
  display: flex;
  flex-direction: column;
}

.loser-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: #ff6b6b;
}

.loser-title {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

/* Rankings section */
.rankings-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1rem;
}

.rankings-section h3 {
  margin: 0 0 1rem 0;
  color: white;
  font-size: 1.1rem;
  text-align: center;
}

.rankings-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: background 0.2s;
}

.ranking-item.is-me {
  background: rgba(var(--ion-color-primary-rgb), 0.2);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.3);
}

.ranking-item.is-loser {
  background: rgba(244, 67, 54, 0.15);
}

.rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.player-name {
  flex: 1;
  color: white;
  font-weight: 500;
}

.you-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--ion-color-primary);
  color: white;
  border-radius: 10px;
  font-weight: 600;
}

.loser-badge {
  font-size: 20px;
}

/* Actions section */
.actions-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: auto;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.play-again-button {
  --border-radius: 12px;
  --background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
  --box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
  font-weight: bold;
  font-size: 1.1rem;
  height: 56px;
}

.menu-button {
  --border-radius: 12px;
  font-weight: 500;
  height: 48px;
}
</style>
