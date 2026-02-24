<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar class="settings-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" color="light"></ion-back-button>
        </ion-buttons>
        <ion-title>Instellingen</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="settings-content">
      <div class="settings-container">

        <!-- Gameplay settings -->
        <div class="settings-card">
          <div class="card-header">
            <span class="card-icon">&#127918;</span>
            <h2>Gameplay</h2>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-icon">&#128266;</span>
              <div class="setting-text">
                <span class="setting-label">Geluidseffecten</span>
                <span class="setting-description">Speel geluiden af tijdens het spel</span>
              </div>
            </div>
            <ion-toggle
              :checked="settingsStore.soundEnabled"
              @ionChange="onSoundChange"
              mode="ios"
            ></ion-toggle>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-icon">&#9889;</span>
              <div class="setting-text">
                <span class="setting-label">Animatiesnelheid</span>
                <span class="setting-description">Hoe snel kaarten bewegen</span>
              </div>
            </div>
            <ion-select
              :value="settingsStore.animationSpeed"
              @ionChange="onAnimationSpeedChange"
              interface="popover"
              class="custom-select"
            >
              <ion-select-option value="slow">Langzaam</ion-select-option>
              <ion-select-option value="normal">Normaal</ion-select-option>
              <ion-select-option value="fast">Snel</ion-select-option>
            </ion-select>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-icon">&#129302;</span>
              <div class="setting-text">
                <span class="setting-label">AI moeilijkheid</span>
                <span class="setting-description">Standaard niveau voor computerspelers</span>
              </div>
            </div>
            <ion-select
              :value="settingsStore.aiDifficulty"
              @ionChange="onDifficultyChange"
              interface="popover"
              class="custom-select"
            >
              <ion-select-option value="easy">Makkelijk</ion-select-option>
              <ion-select-option value="medium">Gemiddeld</ion-select-option>
              <ion-select-option value="hard">Moeilijk</ion-select-option>
            </ion-select>
          </div>
        </div>

        <!-- Display settings -->
        <div class="settings-card">
          <div class="card-header">
            <span class="card-icon">&#127912;</span>
            <h2>Weergave</h2>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-icon">&#127183;</span>
              <div class="setting-text">
                <span class="setting-label">Kaartnotatie</span>
                <span class="setting-description">Hoe plaatjes worden weergegeven</span>
              </div>
            </div>
            <ion-select
              :value="settingsStore.cardNotation"
              @ionChange="onCardNotationChange"
              interface="popover"
              class="custom-select"
            >
              <ion-select-option value="nl">NL (B, V, H)</ion-select-option>
              <ion-select-option value="en">EN (J, Q, K)</ion-select-option>
              <ion-select-option value="gzb">GZB (B, Z, G)</ion-select-option>
            </ion-select>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-icon">&#9995;</span>
              <div class="setting-text">
                <span class="setting-label">Linkshandige modus</span>
                <span class="setting-description">Knoppen voor linkshandigen</span>
              </div>
            </div>
            <ion-toggle
              :checked="settingsStore.leftHandedMode"
              @ionChange="onLeftHandedChange"
              mode="ios"
            ></ion-toggle>
          </div>
        </div>

        <!-- Card back styles -->
        <div class="settings-card card-backs">
          <div class="card-header">
            <span class="card-icon">&#127136;</span>
            <h2>Kaartachterkant</h2>
          </div>

          <div class="card-back-grid">
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
        </div>

        <!-- Reset button -->
        <div class="reset-section">
          <button class="reset-button" @click="resetSettings">
            <span class="reset-icon">&#8635;</span>
            Standaardinstellingen herstellen
          </button>
        </div>

        <!-- Version info -->
        <div class="version-info">
          <span>Shithead v1.0.0</span>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, IonToggle, IonSelect, IonSelectOption } from '@ionic/vue';
import { useSettingsStore, type CardBackStyle, type CardNotation } from '@/stores/settingsStore';

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

function onCardNotationChange(event: CustomEvent) {
  settingsStore.setCardNotation(event.detail.value as CardNotation);
}

function onLeftHandedChange(event: CustomEvent) {
  settingsStore.setLeftHandedMode(event.detail.checked);
}

function onCardBackStyleChange(style: CardBackStyle) {
  settingsStore.setCardBackStyle(style);
}

function resetSettings() {
  settingsStore.resetToDefaults();
}
</script>

<style scoped>
.settings-toolbar {
  --background: transparent;
  --color: white;
  --border-width: 0;
}

.settings-content {
  --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.settings-container {
  padding: 16px;
  padding-bottom: calc(env(safe-area-inset-bottom, 16px) + 32px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Header */
.settings-header {
  text-align: center;
  padding: 16px 0 8px;
}

.header-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.settings-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.settings-header p {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

/* Settings cards */
.settings-card {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.card-icon {
  font-size: 24px;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: white;
}

/* Setting items */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  gap: 12px;
}

.setting-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.setting-item:first-of-type {
  padding-top: 0;
}

.setting-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.setting-icon {
  font-size: 18px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  flex-shrink: 0;
}

.setting-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.setting-label {
  color: white;
  font-size: 15px;
  font-weight: 500;
}

.setting-description {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  line-height: 1.3;
}

/* Toggle styling */
ion-toggle {
  --background: rgba(255, 255, 255, 0.2);
  --background-checked: #4CAF50;
  --handle-background: white;
  --handle-background-checked: white;
  flex-shrink: 0;
  padding-left: 8px;
}

/* Select styling */
.custom-select {
  --color: white;
  --placeholder-color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  max-width: 100px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 4px 0 4px 12px;
}

.custom-select::part(text) {
  color: rgba(255, 255, 255, 0.9);
}

.custom-select::part(icon) {
  color: rgba(255, 255, 255, 0.6);
  margin-left: 4px;
}

/* Card back styles section */
.card-back-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.card-back-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 6px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  background: rgba(0, 0, 0, 0.2);
}

.card-back-option:hover {
  background: rgba(255, 255, 255, 0.1);
}

.card-back-option.selected {
  border-color: #4CAF50;
  background: rgba(76, 175, 80, 0.15);
}

.card-back-preview {
  width: 40px;
  height: 56px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.card-back-inner {
  width: 80%;
  height: 80%;
  border-radius: 3px;
}

/* Card back styles */
.card-back-classic {
  background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
}

.card-back-classic .card-back-inner {
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 2px,
    rgba(255, 255, 255, 0.05) 2px,
    rgba(255, 255, 255, 0.05) 4px
  );
}

.card-back-modern {
  background: linear-gradient(135deg, #b71c1c 0%, #c62828 100%);
}

.card-back-modern .card-back-inner {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background:
    linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.1) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.1) 75%);
  background-size: 8px 8px;
}

.card-back-royal {
  background: linear-gradient(135deg, #4a148c 0%, #6a1b9a 100%);
  box-shadow: inset 0 0 0 1px #ffd700;
}

.card-back-royal .card-back-inner {
  border: 1px solid #ffd700;
  background: radial-gradient(circle at center, rgba(255, 215, 0, 0.2) 0%, transparent 70%);
}

.card-back-minimal {
  background: linear-gradient(135deg, #37474f 0%, #455a64 100%);
}

.card-back-minimal .card-back-inner {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
}

.card-back-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  text-align: center;
}

/* Reset section */
.reset-section {
  padding-top: 8px;
}

.reset-button {
  width: 100%;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.reset-button:hover {
  background: rgba(255, 255, 255, 0.12);
  color: white;
}

.reset-button:active {
  transform: scale(0.98);
}

.reset-icon {
  font-size: 18px;
}

/* Version info */
.version-info {
  text-align: center;
  padding: 16px 0;
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
}
</style>
