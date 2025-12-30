<template>
  <ion-page>
    <ion-content :fullscreen="true" class="ion-padding">
      <div class="home-container">
        <div class="logo-section">
          <h1 class="game-title">SHITHEAD</h1>
          <p class="game-subtitle">Het kaartspel</p>
        </div>

        <div class="menu-buttons">
          <ion-button expand="block" size="large" @click="router.push('/setup')">
            <ion-icon slot="start" :icon="playOutline"></ion-icon>
            Nieuw Spel
          </ion-button>

          <ion-button expand="block" size="large" fill="outline" @click="router.push('/rules')">
            <ion-icon slot="start" :icon="bookOutline"></ion-icon>
            Spelregels
          </ion-button>

          <ion-button expand="block" size="large" fill="outline" @click="router.push('/settings')">
            <ion-icon slot="start" :icon="settingsOutline"></ion-icon>
            Instellingen
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonPage, IonButton, IonIcon } from '@ionic/vue';
import { playOutline, bookOutline, settingsOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  gap: 3rem;
}

.logo-section {
  text-align: center;
}

.game-title {
  font-size: 3rem;
  font-weight: bold;
  margin: 0;
  letter-spacing: 0.2em;
}

.game-subtitle {
  font-size: 1.2rem;
  color: var(--ion-color-medium);
  margin: 0.5rem 0 0 0;
}

.menu-buttons {
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
