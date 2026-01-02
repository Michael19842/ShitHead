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

        <ion-item>
          <ion-label>Kaartbenaming</ion-label>
          <ion-select :value="settingsStore.cardLanguage" @ionChange="onCardLanguageChange">
            <ion-select-option value="nl">Nederlands (B, V, H, A)</ion-select-option>
            <ion-select-option value="en">Engels (J, Q, K, A)</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>

      <h3 class="section-title">Kaartachterkant</h3>
      <div class="card-back-options">
        <div
          v-for="style in cardBackStyles"
          :key="style.value"
          class="card-back-option"
          :class="{ 'selected': settingsStore.cardBackStyle === style.value }"
          @click="onCardBackStyleChange(style.value)"
        >
          <div class="card-back-preview" :class="`card-back-${style.value}`">
            <div class="card-back-inner"></div>
          </div>
          <span class="card-back-label">{{ style.label }}</span>
        </div>
      </div>

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
import { useSettingsStore, type CardBackStyle } from '@/stores/settingsStore';

const settingsStore = useSettingsStore();

const cardBackStyles = [
  { value: 'classic' as CardBackStyle, label: 'Klassiek' },
  { value: 'modern' as CardBackStyle, label: 'Modern' },
  { value: 'royal' as CardBackStyle, label: 'Koninklijk' },
  { value: 'minimal' as CardBackStyle, label: 'Minimaal' },
];

function onSoundChange(event: CustomEvent) {
  settingsStore.setSoundEnabled(event.detail.checked);
}

function onAnimationSpeedChange(event: CustomEvent) {
  settingsStore.setAnimationSpeed(event.detail.value);
}

function onDifficultyChange(event: CustomEvent) {
  settingsStore.setAIDifficulty(event.detail.value);
}

function onCardLanguageChange(event: CustomEvent) {
  settingsStore.setCardLanguage(event.detail.value);
}

function onCardBackStyleChange(style: CardBackStyle) {
  settingsStore.setCardBackStyle(style);
}

function resetSettings() {
  settingsStore.resetToDefaults();
}
</script>

<style scoped>
.section-title {
  margin: 1.5rem 0 1rem;
  color: var(--ion-color-primary);
  font-size: 1.1rem;
}

.card-back-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 8px;
}

.card-back-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.card-back-option:hover {
  background: rgba(var(--ion-color-primary-rgb), 0.1);
}

.card-back-option.selected {
  border-color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.15);
}

.card-back-preview {
  width: 50px;
  height: 70px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.card-back-inner {
  width: 80%;
  height: 80%;
  border-radius: 4px;
}

/* Klassiek - Blauw met diagonale strepen */
.card-back-classic {
  background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
}

.card-back-classic .card-back-inner {
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 3px,
    rgba(255, 255, 255, 0.05) 3px,
    rgba(255, 255, 255, 0.05) 6px
  );
}

/* Modern - Rood met geometrisch patroon */
.card-back-modern {
  background: linear-gradient(135deg, #b71c1c 0%, #c62828 100%);
}

.card-back-modern .card-back-inner {
  border: 2px solid rgba(255, 255, 255, 0.2);
  background:
    linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.1) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.1) 75%);
  background-size: 10px 10px;
}

/* Koninklijk - Paars met gouden accenten */
.card-back-royal {
  background: linear-gradient(135deg, #4a148c 0%, #6a1b9a 100%);
  border: 1px solid #ffd700;
}

.card-back-royal .card-back-inner {
  border: 2px solid #ffd700;
  background: radial-gradient(circle at center, rgba(255, 215, 0, 0.2) 0%, transparent 70%);
  position: relative;
}

.card-back-royal .card-back-inner::after {
  content: '♔';
  position: absolute;
  font-size: 20px;
  color: #ffd700;
  opacity: 0.6;
}

/* Minimaal - Donkergrijs, strak */
.card-back-minimal {
  background: linear-gradient(135deg, #37474f 0%, #455a64 100%);
}

.card-back-minimal .card-back-inner {
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
}

.card-back-label {
  font-size: 12px;
  color: var(--ion-text-color);
  font-weight: 500;
}

.reset-section {
  padding: 2rem 0;
}
</style>
