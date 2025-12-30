<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Nieuw Spel</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-list>
        <ion-item>
          <ion-label>Aantal spelers</ion-label>
          <ion-select :value="settingsStore.playerCount" @ionChange="onPlayerCountChange">
            <ion-select-option :value="2">2 spelers</ion-select-option>
            <ion-select-option :value="3">3 spelers</ion-select-option>
            <ion-select-option :value="4">4 spelers</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-label>Menselijke spelers</ion-label>
          <ion-select :value="settingsStore.humanPlayerCount" @ionChange="onHumanCountChange">
            <ion-select-option v-for="n in settingsStore.playerCount" :key="n" :value="n">
              {{ n }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item v-if="settingsStore.humanPlayerCount < settingsStore.playerCount">
          <ion-label>AI Moeilijkheid</ion-label>
          <ion-select :value="settingsStore.aiDifficulty" @ionChange="onDifficultyChange">
            <ion-select-option value="easy">Makkelijk</ion-select-option>
            <ion-select-option value="medium">Gemiddeld</ion-select-option>
            <ion-select-option value="hard">Moeilijk</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item-divider>
          <ion-label>Speler namen</ion-label>
        </ion-item-divider>

        <ion-item v-for="(name, index) in visiblePlayerNames" :key="index">
          <ion-input
            :label="'Speler ' + (index + 1)"
            :value="name"
            @ionInput="updatePlayerName(index, $event)"
            :placeholder="index < settingsStore.humanPlayerCount ? 'Naam' : 'Computer'"
          ></ion-input>
        </ion-item>
      </ion-list>

      <div class="start-button-container">
        <ion-button expand="block" size="large" @click="startGame">
          Start Spel
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonSelect, IonSelectOption,
  IonInput, IonButton, IonButtons, IonBackButton, IonItemDivider
} from '@ionic/vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settingsStore';
import { computed } from 'vue';

const router = useRouter();
const settingsStore = useSettingsStore();

const visiblePlayerNames = computed(() => 
  settingsStore.playerNames.slice(0, settingsStore.playerCount)
);

function onPlayerCountChange(event: CustomEvent) {
  settingsStore.setPlayerCount(event.detail.value);
}

function onHumanCountChange(event: CustomEvent) {
  settingsStore.setHumanPlayerCount(event.detail.value);
}

function onDifficultyChange(event: CustomEvent) {
  settingsStore.setAIDifficulty(event.detail.value);
}

function updatePlayerName(index: number, event: CustomEvent) {
  settingsStore.setPlayerName(index, event.detail.value || '');
}

function startGame() {
  router.push('/game');
}
</script>

<style scoped>
.start-button-container {
  padding: 2rem 0;
}

ion-button {
  --border-radius: 12px;
}
</style>
