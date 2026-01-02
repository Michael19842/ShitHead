<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="lobby-toolbar">
        <ion-buttons slot="start">
          <ion-button @click="handleBack">
            <ion-icon :icon="arrowBack" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ isPrivate ? 'Privé Lobby' : 'Wachtkamer' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="lobby-content">
      <div class="lobby-container">
        <!-- Loading state -->
        <div v-if="isLoading" class="loading-state">
          <ion-spinner name="crescent" />
          <p>Lobby laden...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="lobbyStore.error && !lobbyStore.currentLobby" class="error-state">
          <div class="error-icon">😕</div>
          <p>{{ lobbyStore.error }}</p>
          <ion-button @click="router.replace('/online')">
            Terug naar menu
          </ion-button>
        </div>

        <!-- Lobby content -->
        <template v-else-if="lobbyStore.currentLobby">
          <!-- Lobby code (private only) -->
          <div v-if="lobbyStore.lobbyCode" class="lobby-code-section">
            <p class="code-label">Deel deze code met vrienden:</p>
            <div class="lobby-code" @click="copyCode">
              <span class="code-text">{{ lobbyStore.lobbyCode }}</span>
              <ion-icon :icon="copyOutline" />
            </div>
            <p v-if="codeCopied" class="code-copied">Gekopieerd!</p>
          </div>

          <!-- Player list -->
          <PlayerList
            :players="lobbyStore.players"
            :target-count="lobbyStore.targetPlayerCount"
            :my-player-id="authStore.playerId"
          />

          <!-- Status message -->
          <div class="status-section">
            <template v-if="!lobbyStore.isFull">
              <div class="status-waiting">
                <ion-spinner name="dots" />
                <span>Wachten op meer spelers...</span>
              </div>
            </template>
            <template v-else-if="!lobbyStore.allReady">
              <div class="status-waiting">
                <ion-spinner name="dots" />
                <span>Wachten tot iedereen klaar is...</span>
              </div>
            </template>
            <template v-else>
              <div class="status-ready">
                <ion-icon :icon="checkmarkCircle" />
                <span>Iedereen is klaar!</span>
              </div>
            </template>
          </div>

          <!-- Action buttons -->
          <div class="action-section">
            <!-- Ready button (non-host) -->
            <ion-button
              v-if="!lobbyStore.isHost"
              expand="block"
              size="large"
              :color="lobbyStore.isReady ? 'medium' : 'success'"
              @click="lobbyStore.toggleReady"
              class="ready-button"
            >
              <ion-icon slot="start" :icon="lobbyStore.isReady ? closeCircle : checkmarkCircle" />
              {{ lobbyStore.isReady ? 'Niet Klaar' : 'Klaar!' }}
            </ion-button>

            <!-- Start button (host only) -->
            <ion-button
              v-if="lobbyStore.isHost"
              expand="block"
              size="large"
              color="success"
              :disabled="!lobbyStore.canStart"
              @click="startGame"
              class="start-button"
            >
              <ion-icon slot="start" :icon="playCircle" />
              Start Spel
            </ion-button>

            <!-- Leave button -->
            <ion-button
              expand="block"
              fill="outline"
              color="danger"
              @click="confirmLeave"
              class="leave-button"
            >
              <ion-icon slot="start" :icon="exitOutline" />
              Verlaat Lobby
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
  IonButtons, IonButton, IonIcon, IonSpinner,
  alertController, toastController
} from '@ionic/vue';
import {
  arrowBack, copyOutline, checkmarkCircle, closeCircle,
  playCircle, exitOutline
} from 'ionicons/icons';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useLobbyStore } from '@/stores/lobbyStore';
import { useAuthStore } from '@/stores/authStore';
import PlayerList from '@/components/online/PlayerList.vue';
import { createGameFromLobby } from '@/services/firebase/gameService';

const router = useRouter();
const route = useRoute();
const lobbyStore = useLobbyStore();
const authStore = useAuthStore();

const isLoading = ref(true);
const codeCopied = ref(false);

const isPrivate = computed(() => lobbyStore.currentLobby?.type === 'private');

onMounted(async () => {
  await authStore.initialize();

  if (!authStore.isRegistered) {
    router.replace('/online/register');
    return;
  }

  const lobbyId = route.params.lobbyId as string;

  // Handle special routes
  if (lobbyId === 'new') {
    await createNewLobby();
  } else if (lobbyId === 'join') {
    await joinWithCode();
  } else {
    await joinOrRejoinLobby(lobbyId);
  }

  isLoading.value = false;
});

onUnmounted(() => {
  // Don't cleanup if navigating to game
  if (!route.path.includes('/online/game')) {
    // Cleanup handled by leaving lobby
  }
});

// Watch for lobby status changes
watch(() => lobbyStore.currentLobby?.status, (status) => {
  if (status === 'in_game' && lobbyStore.currentLobby?.gameId) {
    router.replace(`/online/game/${lobbyStore.currentLobby.gameId}`);
  }
});

async function createNewLobby() {
  const type = route.query.type as 'random' | 'private' || 'private';
  const playerCount = parseInt(route.query.playerCount as string) || 2;

  const lobbyId = await lobbyStore.create(type, playerCount);

  if (!lobbyId) {
    return;
  }

  // Update URL without creating history entry
  router.replace(`/online/lobby/${lobbyId}`);
}

async function joinWithCode() {
  const code = route.query.code as string;

  if (!code) {
    lobbyStore.error = 'Geen code opgegeven';
    return;
  }

  const success = await lobbyStore.joinByCode(code);

  if (success && lobbyStore.lobbyId) {
    router.replace(`/online/lobby/${lobbyStore.lobbyId}`);
  }
}

async function joinOrRejoinLobby(lobbyId: string) {
  // Try to rejoin first (in case we're already a member)
  const rejoined = await lobbyStore.rejoin(lobbyId);

  if (!rejoined) {
    // Try to join as new player
    await lobbyStore.join(lobbyId);
  }
}

async function copyCode() {
  if (!lobbyStore.lobbyCode) return;

  try {
    await navigator.clipboard.writeText(lobbyStore.lobbyCode);
    codeCopied.value = true;
    setTimeout(() => codeCopied.value = false, 2000);

    const toast = await toastController.create({
      message: 'Code gekopieerd!',
      duration: 1500,
      position: 'top',
      color: 'success'
    });
    await toast.present();
  } catch {
    // Clipboard API not available
  }
}

async function startGame() {
  if (!lobbyStore.canStart || !lobbyStore.lobbyId) return;

  try {
    const gameId = await createGameFromLobby(lobbyStore.lobbyId);

    if (gameId) {
      // Navigation will happen automatically via the watch on lobby status
      // But we can also navigate directly
      router.replace(`/online/game/${gameId}`);
    } else {
      const toast = await toastController.create({
        message: 'Kon spel niet starten',
        duration: 2000,
        position: 'top',
        color: 'danger'
      });
      await toast.present();
    }
  } catch (err) {
    const toast = await toastController.create({
      message: err instanceof Error ? err.message : 'Fout bij starten spel',
      duration: 2000,
      position: 'top',
      color: 'danger'
    });
    await toast.present();
  }
}

async function confirmLeave() {
  const alert = await alertController.create({
    header: 'Lobby verlaten?',
    message: 'Weet je zeker dat je de lobby wilt verlaten?',
    buttons: [
      { text: 'Annuleren', role: 'cancel' },
      {
        text: 'Verlaten',
        role: 'destructive',
        handler: async () => {
          await lobbyStore.leave();
          router.replace('/online');
        }
      }
    ]
  });
  await alert.present();
}

function handleBack() {
  confirmLeave();
}
</script>

<style scoped>
.lobby-toolbar {
  --background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
  --color: white;
}

.lobby-content {
  --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.lobby-container {
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

/* Lobby code section */
.lobby-code-section {
  text-align: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.code-label {
  margin: 0 0 0.75rem 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.lobby-code {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.lobby-code:hover {
  background: rgba(255, 255, 255, 0.15);
}

.lobby-code:active {
  background: rgba(255, 255, 255, 0.2);
}

.code-text {
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  color: white;
  font-family: monospace;
}

.lobby-code ion-icon {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.6);
}

.code-copied {
  margin: 0.5rem 0 0 0;
  color: var(--ion-color-success);
  font-size: 0.85rem;
}

/* Status section */
.status-section {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  text-align: center;
}

.status-waiting,
.status-ready {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
}

.status-ready {
  color: var(--ion-color-success);
}

.status-ready ion-icon {
  font-size: 24px;
}

/* Action section */
.action-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: auto;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.ready-button,
.start-button {
  --border-radius: 12px;
  font-weight: bold;
  font-size: 1.1rem;
  height: 56px;
}

.start-button {
  --background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
  --box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
}

.start-button[disabled] {
  --background: rgba(255, 255, 255, 0.2);
  --box-shadow: none;
  opacity: 0.6;
}

.leave-button {
  --border-radius: 12px;
  font-weight: 500;
  height: 48px;
}
</style>
