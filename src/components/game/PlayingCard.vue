<template>
  <div
    class="playing-card"
    :class="{
      'face-down': faceDown,
      'selected': selected,
      'playable': playable,
      'disabled': disabled,
      'locked': locked,
      [suitClass]: !faceDown
    }"
    :style="cardStyle"
    @click="handleClick"
  >
    <!-- Face down card -->
    <div v-if="faceDown" class="card-back" :class="cardBackClass">
      <div class="card-pattern">
        <div class="pattern-inner"></div>
      </div>
      <!-- Lock overlay for face-down cards that can't be played yet -->
      <div v-if="locked" class="lock-overlay lock-overlay-dark">
        <span class="lock-icon">🔒</span>
      </div>
    </div>

    <!-- Face up card -->
    <div v-else class="card-front">
      <div class="card-corner top-left">
        <span class="rank">{{ rankDisplay }}</span>
        <span class="suit">{{ suitSymbol }}</span>
      </div>
      <div class="card-center">
        <span class="suit-large">{{ suitSymbol }}</span>
      </div>
      <div class="card-corner bottom-right">
        <span class="rank">{{ rankDisplay }}</span>
        <span class="suit">{{ suitSymbol }}</span>
      </div>

      <!-- Special card indicator -->
      <div v-if="isSpecialCard" class="special-indicator" :class="specialClass"></div>

      <!-- Lock overlay for cards that can't be played yet -->
      <div v-if="locked" class="lock-overlay">
        <span class="lock-icon">🔒</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Card } from '@/types';
import { RANK_NAMES_EN, RANK_NAMES_NL, SUIT_SYMBOLS, SPECIAL_CARDS } from '@/types';
import { useSettingsStore } from '@/stores/settingsStore';

const settingsStore = useSettingsStore();

const props = defineProps<{
  card?: Card;
  faceDown?: boolean;
  selected?: boolean;
  playable?: boolean;
  disabled?: boolean;
  locked?: boolean;
  delay?: number;
}>();

const emit = defineEmits<{
  (e: 'click', card: Card | undefined): void;
}>();

const rankDisplay = computed(() => {
  if (!props.card) return '';
  const rankNames = settingsStore.cardLanguage === 'nl' ? RANK_NAMES_NL : RANK_NAMES_EN;
  return rankNames[props.card.rank] || props.card.rank.toString();
});

const cardBackClass = computed(() => {
  return `card-back-${settingsStore.cardBackStyle}`;
});

const suitSymbol = computed(() => {
  if (!props.card) return '';
  return SUIT_SYMBOLS[props.card.suit];
});

const suitClass = computed(() => {
  if (!props.card) return '';
  return `suit-${props.card.suit}`;
});

const isSpecialCard = computed(() => {
  if (!props.card) return false;
  const rank = props.card.rank;
  return rank === SPECIAL_CARDS.TWO || rank === SPECIAL_CARDS.THREE || rank === SPECIAL_CARDS.SEVEN || rank === SPECIAL_CARDS.TEN || rank === SPECIAL_CARDS.JACK;
});

const specialClass = computed(() => {
  if (!props.card) return '';
  switch (props.card.rank) {
    case SPECIAL_CARDS.TWO: return 'special-blue';
    case SPECIAL_CARDS.THREE: return 'special-purple';
    case SPECIAL_CARDS.SEVEN: return 'special-orange';
    case SPECIAL_CARDS.TEN: return 'special-red';
    case SPECIAL_CARDS.JACK: return 'special-green';
    default: return '';
  }
});

const cardStyle = computed(() => {
  if (props.delay) {
    return { animationDelay: `${props.delay}ms` };
  }
  return {};
});

function handleClick() {
  if (!props.disabled) {
    emit('click', props.card);
  }
}
</script>

<style scoped>
.playing-card {
  width: 60px;
  height: 84px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  position: relative;
  flex-shrink: 0;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transform: translateY(0); /* Explicit default to ensure transition back */
}

/* Face down card - base styles */
.card-back {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 6px;
}

.card-pattern {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pattern-inner {
  width: 60%;
  height: 60%;
  border-radius: 50%;
}

/* ==================== CARD BACK STYLES ==================== */

/* Classic - Blue with diagonal stripes */
.card-back-classic {
  background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
}

.card-back-classic .card-pattern {
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 4px,
    rgba(255, 255, 255, 0.05) 4px,
    rgba(255, 255, 255, 0.05) 8px
  );
}

.card-back-classic .pattern-inner {
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Modern - Red with geometric pattern */
.card-back-modern {
  background: linear-gradient(135deg, #b71c1c 0%, #c62828 100%);
}

.card-back-modern .card-pattern {
  border: 2px solid rgba(255, 255, 255, 0.2);
  background:
    linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.1) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.1) 75%);
  background-size: 12px 12px;
}

.card-back-modern .pattern-inner {
  border: 2px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
}

/* Royal - Purple with golden accents */
.card-back-royal {
  background: linear-gradient(135deg, #4a148c 0%, #6a1b9a 100%);
  box-shadow: inset 0 0 0 1px rgba(255, 215, 0, 0.3);
}

.card-back-royal .card-pattern {
  border: 2px solid #ffd700;
  background: radial-gradient(circle at center, rgba(255, 215, 0, 0.15) 0%, transparent 70%);
}

.card-back-royal .pattern-inner {
  border: 1px solid #ffd700;
  background: radial-gradient(circle at center, rgba(255, 215, 0, 0.2) 0%, transparent 60%);
  position: relative;
}

.card-back-royal .pattern-inner::after {
  content: '♔';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 16px;
  color: #ffd700;
  opacity: 0.7;
}

/* Minimal - Dark grey, clean */
.card-back-minimal {
  background: linear-gradient(135deg, #37474f 0%, #455a64 100%);
}

.card-back-minimal .card-pattern {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
}

.card-back-minimal .pattern-inner {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
}

/* Face up card */
.card-front {
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, #ffffff 0%, #f8f8f8 100%);
  border-radius: 6px;
  border: 1px solid #ddd;
  position: relative;
}

.card-corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-weight: bold;
  line-height: 1;
}

.top-left {
  top: 4px;
  left: 5px;
}

.bottom-right {
  bottom: 4px;
  right: 5px;
  transform: rotate(180deg);
}

.rank {
  font-size: 14px;
  font-weight: 800;
}

.suit {
  font-size: 12px;
}

.card-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.suit-large {
  font-size: 28px;
}

/* Suit colors */
.suit-hearts .rank,
.suit-hearts .suit,
.suit-hearts .suit-large,
.suit-diamonds .rank,
.suit-diamonds .suit,
.suit-diamonds .suit-large {
  color: #c62828;
}

.suit-clubs .rank,
.suit-clubs .suit,
.suit-clubs .suit-large,
.suit-spades .rank,
.suit-spades .suit,
.suit-spades .suit-large {
  color: #1a1a1a;
}

/* Hover effect */
.playing-card:not(.disabled):hover {
  transform: translateY(-6px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

/* Selected state */
.playing-card.selected {
  transform: translateY(-12px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
  outline: 3px solid var(--ion-color-primary);
  outline-offset: -1px;
}

/* Playable state */
.playing-card.playable {
  outline: 2px solid var(--ion-color-success);
  outline-offset: -1px;
}

.playing-card.playable::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 8px;
  border: 2px solid var(--ion-color-success);
  animation: playable-pulse 1.5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes playable-pulse {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

/* Disabled state */
.playing-card.disabled {
  cursor: default;
}

.playing-card.disabled:hover {
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Special card indicator */
.special-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 4px currentColor;
}

.special-blue {
  background: #2196f3;
  color: #2196f3;
}

.special-purple {
  background: #9c27b0;
  color: #9c27b0;
}

.special-orange {
  background: #ff9800;
  color: #ff9800;
}

.special-red {
  background: #f44336;
  color: #f44336;
}

.special-green {
  background: #4caf50;
  color: #4caf50;
}

/* Locked state - cards that can't be played yet */
.playing-card.locked {
  cursor: not-allowed;
}

.playing-card.locked .card-front {
  filter: brightness(0.85);
}

.lock-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(0.5px);
}

.lock-icon {
  font-size: 18px;
  opacity: 0.9;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.lock-overlay-dark {
  background: rgba(0, 0, 0, 0.5);
}
</style>
