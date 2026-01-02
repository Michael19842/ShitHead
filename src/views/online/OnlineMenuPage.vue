<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="online-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" text="" />
        </ion-buttons>
        <ion-title>Online Spelen</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="online-content">
      <div class="online-container">
        <!-- Player info -->
        <div class="player-section">
          <div class="player-avatar">🎮</div>
          <div class="player-info">
            <div class="player-name-row">
              <h2 class="player-name">{{ authStore.playerName }}</h2>
              <ion-button fill="clear" size="small" class="edit-name-btn" @click="openEditName">
                <ion-icon :icon="pencil" />
              </ion-button>
            </div>
            <p class="player-stats">
              {{ playerStats.gamesPlayed }} gespeeld • {{ playerStats.gamesLost }} verloren
            </p>
          </div>
        </div>

        <!-- Ban notice -->
        <transition name="fade">
          <div v-if="banRemaining > 0" class="ban-notice">
            <ion-icon :icon="timeOutline" />
            <div>
              <p class="ban-title">Tijdelijke ban</p>
              <p class="ban-time">Nog {{ formatTime(banRemaining) }}</p>
            </div>
          </div>
        </transition>

        <!-- Menu options -->
        <div class="menu-section">
          <ion-button
            expand="block"
            size="large"
            :disabled="banRemaining > 0"
            @click="startMatchmaking"
            class="primary-button"
          >
            <ion-icon slot="start" :icon="search" />
            Zoek Spel
          </ion-button>

          <ion-button
            expand="block"
            size="large"
            fill="outline"
            :disabled="banRemaining > 0"
            @click="createPrivateLobby"
            class="menu-button"
          >
            <ion-icon slot="start" :icon="addCircle" />
            Maak Privé Lobby
          </ion-button>

          <ion-button
            expand="block"
            size="large"
            fill="outline"
            :disabled="banRemaining > 0"
            @click="showJoinLobby = true"
            class="menu-button"
          >
            <ion-icon slot="start" :icon="enter" />
            Join met Code
          </ion-button>
        </div>

        <!-- Player count selector -->
        <div class="preference-section">
          <h3 class="preference-title">Aantal spelers</h3>
          <div class="player-count-selector">
            <ion-button
              v-for="count in [2, 3, 4]"
              :key="count"
              :fill="selectedPlayerCount === count ? 'solid' : 'outline'"
              @click="selectedPlayerCount = count"
              class="count-button"
            >
              {{ count }}
            </ion-button>
          </div>
        </div>
      </div>

      <!-- Join lobby modal -->
      <ion-modal :is-open="showJoinLobby" @didDismiss="showJoinLobby = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Join Lobby</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="showJoinLobby = false">Sluiten</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="modal-content">
          <div class="modal-body">
            <p class="modal-description">Voer de 6-cijferige code in om een privé lobby te joinen</p>
            <ion-input
              v-model="lobbyCode"
              type="text"
              placeholder="ABCD12"
              :maxlength="6"
              class="code-input"
              @keyup.enter="joinWithCode"
            />
            <ion-button
              expand="block"
              :disabled="lobbyCode.length !== 6"
              @click="joinWithCode"
            >
              Join Lobby
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>

      <!-- Edit name modal -->
      <ion-modal :is-open="showEditName" @didDismiss="showEditName = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Naam Wijzigen</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="showEditName = false">Sluiten</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="modal-content">
          <div class="modal-body">
            <p class="modal-description">Kies een nieuwe gebruikersnaam</p>
            <ion-input
              v-model="newPlayerName"
              type="text"
              placeholder="Nieuwe naam"
              :maxlength="20"
              class="name-input"
              @keyup.enter="saveNewName"
            />
            <ion-button
              expand="block"
              :disabled="!isValidName || isSaving"
              @click="saveNewName"
            >
              <span v-if="isSaving">Opslaan...</span>
              <span v-else>Opslaan</span>
            </ion-button>
            <p v-if="saveError" class="error-message">{{ saveError }}</p>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonButton, IonIcon, IonModal, IonInput
} from '@ionic/vue';
import { search, addCircle, enter, timeOutline, pencil } from 'ionicons/icons';
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { getBanRemainingSeconds } from '@/services/firebase/playerService';

const router = useRouter();
const authStore = useAuthStore();

const selectedPlayerCount = ref(2);
const showJoinLobby = ref(false);
const lobbyCode = ref('');
const banRemaining = ref(0);

// Edit name state
const showEditName = ref(false);
const newPlayerName = ref('');
const isSaving = ref(false);
const saveError = ref('');

const isValidName = computed(() => {
  const name = newPlayerName.value.trim();
  return name.length >= 2 && name.length <= 20;
});

const playerStats = computed(() => authStore.player?.stats || {
  gamesPlayed: 0,
  gamesLost: 0,
  totalTimeouts: 0
});

onMounted(async () => {
  await authStore.initialize();

  // Redirect to registration if not registered
  if (!authStore.isRegistered) {
    router.replace('/online/register');
    return;
  }

  // Check for ban
  if (authStore.playerId) {
    banRemaining.value = await getBanRemainingSeconds(authStore.playerId);

    // Start countdown if banned
    if (banRemaining.value > 0) {
      const interval = setInterval(() => {
        banRemaining.value--;
        if (banRemaining.value <= 0) {
          clearInterval(interval);
        }
      }, 1000);
    }
  }
});

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function startMatchmaking() {
  router.push({
    path: '/online/matchmaking',
    query: { playerCount: selectedPlayerCount.value }
  });
}

function createPrivateLobby() {
  router.push({
    path: '/online/lobby/new',
    query: { playerCount: selectedPlayerCount.value, type: 'private' }
  });
}

function joinWithCode() {
  if (lobbyCode.value.length !== 6) return;

  router.push({
    path: '/online/lobby/join',
    query: { code: lobbyCode.value.toUpperCase() }
  });
}

function openEditName() {
  newPlayerName.value = authStore.playerName || '';
  saveError.value = '';
  showEditName.value = true;
}

async function saveNewName() {
  if (!isValidName.value || isSaving.value) return;

  isSaving.value = true;
  saveError.value = '';

  try {
    const success = await authStore.updatePlayerName(newPlayerName.value.trim());
    if (success) {
      showEditName.value = false;
    } else {
      saveError.value = authStore.error || 'Opslaan mislukt';
    }
  } catch (err) {
    saveError.value = 'Er ging iets mis';
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
.online-toolbar {
  --background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
  --color: white;
}

.online-content {
  --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.online-container {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 1.5rem;
  gap: 1.5rem;
}

/* Player section */
.player-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.player-avatar {
  font-size: 48px;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

.player-info {
  flex: 1;
}

.player-name-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.player-name {
  font-size: 1.4rem;
  font-weight: 700;
  color: white;
  margin: 0;
}

.edit-name-btn {
  --color: rgba(255, 255, 255, 0.6);
  --padding-start: 4px;
  --padding-end: 4px;
  margin: 0;
  height: 28px;
}

.edit-name-btn ion-icon {
  font-size: 16px;
}

.edit-name-btn:hover {
  --color: white;
}

.player-stats {
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  font-size: 0.9rem;
}

/* Ban notice */
.ban-notice {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 152, 0, 0.2);
  border: 1px solid rgba(255, 152, 0, 0.5);
  border-radius: 12px;
  color: #ffcc80;
}

.ban-notice ion-icon {
  font-size: 32px;
}

.ban-title {
  margin: 0;
  font-weight: 600;
  font-size: 1rem;
}

.ban-time {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}

/* Menu section */
.menu-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.primary-button {
  --background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
  --border-radius: 12px;
  --box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
  font-weight: bold;
  font-size: 1.1rem;
  height: 56px;
}

.menu-button {
  --border-radius: 12px;
  --border-width: 2px;
  --border-color: rgba(255, 255, 255, 0.3);
  --color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  height: 50px;
  --background: rgba(255, 255, 255, 0.1);
}

/* Preference section */
.preference-section {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.preference-title {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.player-count-selector {
  display: flex;
  gap: 0.5rem;
}

.count-button {
  flex: 1;
  --border-radius: 8px;
  font-weight: 600;
  font-size: 1.1rem;
}

/* Modal */
.modal-content {
  --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.modal-body {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.modal-description {
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  margin: 0;
}

.code-input {
  --background: rgba(255, 255, 255, 0.1);
  --color: white;
  --placeholder-color: rgba(255, 255, 255, 0.5);
  --padding-start: 16px;
  --padding-end: 16px;
  --border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-size: 1.5rem;
  text-align: center;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  min-height: 60px;
}

.name-input {
  --background: rgba(255, 255, 255, 0.1);
  --color: white;
  --placeholder-color: rgba(255, 255, 255, 0.5);
  --padding-start: 16px;
  --padding-end: 16px;
  --border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-size: 1.2rem;
  min-height: 50px;
}

.error-message {
  color: #ff6b6b;
  text-align: center;
  margin: 0;
  font-size: 0.9rem;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
