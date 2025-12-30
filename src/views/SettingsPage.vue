<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Instellingen</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-list>
        <ion-item>
          <ion-toggle :checked="settingsStore.soundEnabled" @ionChange="onSoundChange">
            Geluidseffecten
          </ion-toggle>
        </ion-item>

        <ion-item>
          <ion-label>Animatiesnelheid</ion-label>
          <ion-select :value="settingsStore.animationSpeed" @ionChange="onAnimationSpeedChange">
            <ion-select-option value="slow">Langzaam</ion-select-option>
            <ion-select-option value="normal">Normaal</ion-select-option>
            <ion-select-option value="fast">Snel</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-label>Standaard AI moeilijkheid</ion-label>
          <ion-select :value="settingsStore.aiDifficulty" @ionChange="onDifficultyChange">
            <ion-select-option value="easy">Makkelijk</ion-select-option>
            <ion-select-option value="medium">Gemiddeld</ion-select-option>
            <ion-select-option value="hard">Moeilijk</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>

      <div class="reset-section">
        <ion-button expand="block" fill="outline" color="medium" @click="resetSettings">
          Standaardinstellingen herstellen
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonToggle, IonSelect, IonSelectOption, IonButton } from '@ionic/vue';
import { useSettingsStore } from '@/stores/settingsStore';

const settingsStore = useSettingsStore();

function onSoundChange(event: CustomEvent) {
  settingsStore.setSoundEnabled(event.detail.checked);
}

function onAnimationSpeedChange(event: CustomEvent) {
  settingsStore.setAnimationSpeed(event.detail.value);
}

function onDifficultyChange(event: CustomEvent) {
  settingsStore.setAIDifficulty(event.detail.value);
}

function resetSettings() {
  settingsStore.resetToDefaults();
}
</script>

<style scoped>
.reset-section {
  padding: 2rem 0;
}
</style>
