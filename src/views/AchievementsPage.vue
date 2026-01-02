<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/" text=""></ion-back-button>
        </ion-buttons>
        <ion-title>Achievements</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="achievements-content">
      <div class="achievements-container">
        <!-- Progress header -->
        <div class="progress-header">
          <div class="trophy-icon">🏆</div>
          <div class="progress-text">
            <span class="progress-count">{{ achievementStore.unlockedCount }}</span>
            <span class="progress-separator">/</span>
            <span class="progress-total">{{ achievementStore.totalCount }}</span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${(achievementStore.unlockedCount / achievementStore.totalCount) * 100}%` }"
            ></div>
          </div>
        </div>

        <!-- Achievements grid -->
        <div class="achievements-grid">
          <div
            v-for="achievement in achievementStore.allAchievements"
            :key="achievement.id"
            class="achievement-card"
            :class="{
              unlocked: achievement.unlocked,
              locked: !achievement.unlocked,
              secret: achievement.secret && !achievement.unlocked
            }"
          >
            <div class="achievement-emoji">
              {{ achievement.unlocked || !achievement.secret ? achievement.emoji : '❓' }}
            </div>
            <div class="achievement-info">
              <div class="achievement-name">
                {{ achievement.unlocked || !achievement.secret ? achievement.name : '???' }}
              </div>
              <div class="achievement-description">
                {{ achievement.unlocked || !achievement.secret ? achievement.description : 'Geheim achievement' }}
              </div>
            </div>
            <div v-if="achievement.unlocked" class="achievement-check">✓</div>
          </div>
        </div>

        <!-- Stats section -->
        <div class="stats-section">
          <h3>Statistieken</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ achievementStore.stats.totalGames }}</div>
              <div class="stat-label">Potjes</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ achievementStore.stats.totalWins }}</div>
              <div class="stat-label">Gewonnen</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ achievementStore.stats.totalLosses }}</div>
              <div class="stat-label">Verloren</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ achievementStore.stats.totalBurns }}</div>
              <div class="stat-label">Burns</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ achievementStore.stats.maxWinStreak }}</div>
              <div class="stat-label">Beste reeks</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ winRate }}%</div>
              <div class="stat-label">Win rate</div>
            </div>
          </div>
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
import { computed, onMounted } from 'vue';
import { useAchievementStore } from '@/stores/achievementStore';

const achievementStore = useAchievementStore();

const winRate = computed(() => {
  if (achievementStore.stats.totalGames === 0) return 0;
  return Math.round((achievementStore.stats.totalWins / achievementStore.stats.totalGames) * 100);
});

onMounted(async () => {
  if (!achievementStore.isInitialized) {
    await achievementStore.load();
  }
});
</script>

<style scoped>
.achievements-content {
  --background: linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.achievements-container {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.progress-header {
  text-align: center;
  padding: 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  margin-bottom: 24px;
}

.trophy-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.progress-text {
  font-size: 32px;
  font-weight: bold;
  color: white;
  margin-bottom: 16px;
}

.progress-count {
  color: #ffd700;
}

.progress-separator {
  color: rgba(255, 255, 255, 0.5);
  margin: 0 4px;
}

.progress-total {
  color: rgba(255, 255, 255, 0.7);
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffd700, #ffaa00);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.achievements-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
}

.achievement-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  transition: all 0.3s ease;
}

.achievement-card.unlocked {
  background: rgba(255, 215, 0, 0.15);
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.achievement-card.locked {
  opacity: 0.6;
}

.achievement-card.secret {
  background: rgba(128, 0, 128, 0.2);
  border: 1px dashed rgba(128, 0, 128, 0.4);
}

.achievement-emoji {
  font-size: 40px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  flex-shrink: 0;
}

.achievement-card.locked .achievement-emoji {
  filter: grayscale(100%);
}

.achievement-info {
  flex: 1;
  min-width: 0;
}

.achievement-name {
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}

.achievement-card.locked .achievement-name {
  color: rgba(255, 255, 255, 0.7);
}

.achievement-description {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.3;
}

.achievement-check {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.stats-section {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 20px;
}

.stats-section h3 {
  color: white;
  margin: 0 0 16px 0;
  text-align: center;
  font-size: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #ffd700;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4px;
}
</style>
