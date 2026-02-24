<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar class="setup-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" color="light"></ion-back-button>
        </ion-buttons>
        <ion-title>Nieuw Spel</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="setup-content">
      <div class="setup-container">
        <!-- Header section -->
        <div class="header-section">
          <div class="header-icon">🎮</div>
          <h2>Spel Instellen</h2>
          <p>Kies je tegenstanders en start het gevecht!</p>
        </div>

        <!-- Settings cards -->
        <div class="settings-section">
          <!-- Player count card -->
          <div class="setting-card">
            <div class="setting-icon">👥</div>
            <div class="setting-content">
              <label>Aantal spelers</label>
              <div class="button-group">
                <button
                  v-for="n in [2, 3, 4]"
                  :key="n"
                  :class="['count-btn', { active: settingsStore.playerCount === n }]"
                  @click="setPlayerCount(n)"
                >
                  {{ n }}
                </button>
              </div>
            </div>
          </div>

          <!-- Human players card -->
          <div class="setting-card">
            <div class="setting-icon">🧑</div>
            <div class="setting-content">
              <label>Menselijke spelers</label>
              <div class="button-group">
                <button
                  v-for="n in settingsStore.playerCount"
                  :key="n"
                  :class="['count-btn', { active: settingsStore.humanPlayerCount === n }]"
                  @click="setHumanCount(n)"
                >
                  {{ n }}
                </button>
              </div>
            </div>
          </div>

          <!-- AI Difficulty card -->
          <div class="setting-card" v-if="settingsStore.humanPlayerCount < settingsStore.playerCount">
            <div class="setting-icon">🤖</div>
            <div class="setting-content">
              <label>AI Moeilijkheid</label>
              <div class="button-group difficulty">
                <button
                  :class="['diff-btn easy', { active: settingsStore.aiDifficulty === 'easy' }]"
                  @click="setDifficulty('easy')"
                >
                  Makkelijk
                </button>
                <button
                  :class="['diff-btn medium', { active: settingsStore.aiDifficulty === 'medium' }]"
                  @click="setDifficulty('medium')"
                >
                  Gemiddeld
                </button>
                <button
                  :class="['diff-btn hard', { active: settingsStore.aiDifficulty === 'hard' }]"
                  @click="setDifficulty('hard')"
                >
                  Moeilijk
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Player names section -->
        <div class="names-section">
          <div class="names-header">
            <span class="names-icon">✏️</span>
            <span>Spelers</span>
            <button
              v-if="settingsStore.humanPlayerCount < settingsStore.playerCount"
              class="shuffle-btn"
              @click="settingsStore.shuffleAICharacters()"
              title="Andere tegenstanders"
            >
              🔀
            </button>
          </div>

          <div class="names-list">
            <div
              v-for="(name, index) in visiblePlayerNames"
              :key="index"
              class="name-input-wrapper"
            >
              <div class="player-avatar" :class="{ ai: index >= settingsStore.humanPlayerCount }">
                {{ getPlayerIcon(index) }}
              </div>
              <input
                v-if="index < settingsStore.humanPlayerCount"
                type="text"
                :value="name"
                @input="updatePlayerName(index, $event)"
                :placeholder="`Speler ${index + 1}`"
                class="name-input"
              />
              <div v-else class="ai-name-display">
                <span class="ai-name">{{ name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Start button -->
        <div class="start-section">
          <button class="start-button" @click="startGame">
            <span class="start-icon">🚀</span>
            <span>Start Spel</span>
          </button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton
} from '@ionic/vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settingsStore';
import { computed } from 'vue';

const router = useRouter();
const settingsStore = useSettingsStore();

const visiblePlayerNames = computed(() =>
  settingsStore.playerNames.slice(0, settingsStore.playerCount)
);

const playerEmojis = ['😀', '😎', '🤩', '😇'];

function getPlayerIcon(index: number): string {
  if (index < settingsStore.humanPlayerCount) {
    return playerEmojis[index % playerEmojis.length];
  }
  // AI player - get icon from character
  const aiIndex = index - settingsStore.humanPlayerCount;
  const character = settingsStore.aiCharacters[aiIndex];
  return character?.icon || '🤖';
}

function setPlayerCount(count: number) {
  settingsStore.setPlayerCount(count);
}

function setHumanCount(count: number) {
  settingsStore.setHumanPlayerCount(count);
}

function setDifficulty(difficulty: 'easy' | 'medium' | 'hard') {
  settingsStore.setAIDifficulty(difficulty);
}

function updatePlayerName(index: number, event: Event) {
  const target = event.target as HTMLInputElement;
  settingsStore.setPlayerName(index, target.value || '');
}

function startGame() {
  router.push('/game');
}
</script>

<style scoped>
.setup-toolbar {
  --background: transparent;
  --color: white;
  --border-width: 0;
}

.setup-content {
  --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.setup-container {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 16px;
  padding-bottom: calc(env(safe-area-inset-bottom, 16px) + 16px);
  gap: 20px;
}

/* Header section */
.header-section {
  text-align: center;
  padding: 16px 0;
}

.header-icon {
  font-size: 48px;
  margin-bottom: 8px;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.header-section h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-section p {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

/* Settings section */
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.setting-icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.setting-content {
  flex: 1;
}

.setting-content label {
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  margin-bottom: 8px;
  font-weight: 500;
}

.button-group {
  display: flex;
  gap: 8px;
}

.count-btn {
  flex: 1;
  padding: 10px 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.count-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.count-btn.active {
  background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
  border-color: #4caf50;
  color: white;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
}

.button-group.difficulty {
  flex-wrap: wrap;
}

.diff-btn {
  flex: 1;
  min-width: 80px;
  padding: 10px 12px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.diff-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.diff-btn.easy.active {
  background: linear-gradient(135deg, #66bb6a 0%, #43a047 100%);
  border-color: #66bb6a;
  color: white;
  box-shadow: 0 4px 15px rgba(102, 187, 106, 0.4);
}

.diff-btn.medium.active {
  background: linear-gradient(135deg, #ffa726 0%, #fb8c00 100%);
  border-color: #ffa726;
  color: white;
  box-shadow: 0 4px 15px rgba(255, 167, 38, 0.4);
}

.diff-btn.hard.active {
  background: linear-gradient(135deg, #ef5350 0%, #e53935 100%);
  border-color: #ef5350;
  color: white;
  box-shadow: 0 4px 15px rgba(239, 83, 80, 0.4);
}

/* Names section */
.names-section {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.names-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.names-icon {
  font-size: 18px;
}

.names-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.name-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.player-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
  border-radius: 50%;
  font-size: 20px;
  box-shadow: 0 4px 10px rgba(76, 175, 80, 0.3);
}

.player-avatar.ai {
  background: linear-gradient(135deg, #5c6bc0 0%, #3949ab 100%);
  box-shadow: 0 4px 10px rgba(92, 107, 192, 0.3);
}

.name-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 15px;
  outline: none;
  transition: all 0.2s ease;
}

.name-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.name-input:focus {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
}

.ai-name-display {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
}

.ai-name {
  color: white;
  font-size: 15px;
  font-weight: 500;
}

.ai-difficulty {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
}

.ai-difficulty.easy {
  background: linear-gradient(135deg, #66bb6a 0%, #43a047 100%);
  color: white;
}

.ai-difficulty.medium {
  background: linear-gradient(135deg, #ffa726 0%, #fb8c00 100%);
  color: white;
}

.ai-difficulty.hard {
  background: linear-gradient(135deg, #ef5350 0%, #e53935 100%);
  color: white;
}

.shuffle-btn {
  margin-left: auto;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.shuffle-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(180deg);
}

/* Start section */
.start-section {
  margin-top: auto;
  padding-top: 16px;
}

.start-button {
  width: 100%;
  padding: 18px 32px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
  color: white;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
  transition: all 0.3s ease;
}

.start-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(76, 175, 80, 0.5);
}

.start-button:active {
  transform: translateY(0);
}

.start-icon {
  font-size: 24px;
}
</style>
