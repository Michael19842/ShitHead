<template>
  <ion-page>
    <ion-content :fullscreen="true" class="ion-padding">
      <div class="game-over-container">
        <h1>Spel Afgelopen!</h1>
        
        <div class="loser-section">
          <p class="loser-label">De verliezer is:</p>
          <h2 class="loser-name">{{ loserName }}</h2>
          <p class="loser-title">SHITHEAD!</p>
        </div>

        <div class="action-buttons">
          <ion-button expand="block" size="large" @click="router.push('/setup')">
            Opnieuw Spelen
          </ion-button>
          <ion-button expand="block" size="large" fill="outline" @click="router.push('/home')">
            Hoofdmenu
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonButton } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/gameStore';
import { computed } from 'vue';

const router = useRouter();
const gameStore = useGameStore();

const loserName = computed(() => gameStore.loser?.name || 'Onbekend');
</script>

<style scoped>
.game-over-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  gap: 2rem;
  text-align: center;
}

.loser-section {
  padding: 2rem;
}

.loser-label {
  font-size: 1.2rem;
  color: var(--ion-color-medium);
  margin: 0;
}

.loser-name {
  font-size: 2.5rem;
  margin: 0.5rem 0;
}

.loser-title {
  font-size: 2rem;
  font-weight: bold;
  color: var(--ion-color-danger);
  margin: 0;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 300px;
}

ion-button {
  --border-radius: 12px;
}
</style>
