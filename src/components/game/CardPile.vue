<template>
  <div class="card-pile" :class="{ 'clickable': clickable, 'about-to-burn': aboutToBurn && showEffects }" @click="handleClick">
    <!-- About to burn effect (3 same cards) -->
    <div v-if="aboutToBurn && showEffects" class="burn-warning">
      <div class="smoke-container">
        <div v-for="i in 8" :key="`smoke-${i}`" class="smoke" :style="{ '--delay': `${i * 0.3}s`, '--x': `${(i % 3 - 1) * 15}px` }"></div>
      </div>
      <div class="ember-edges">
        <div class="ember-edge top"></div>
        <div class="ember-edge right"></div>
        <div class="ember-edge bottom"></div>
        <div class="ember-edge left"></div>
      </div>
    </div>

    <div class="pile-stack" v-if="cards.length > 0">
      <!-- Stack shadow layers (underneath) -->
      <TransitionGroup name="stack-layer">
        <div
          v-for="(_, index) in stackLayers"
          :key="`layer-${index}`"
          class="stack-layer"
          :style="{
            bottom: `${(index + 1) * -2}px`,
            left: `${(index + 1) * 2}px`,
            zIndex: stackLayers - index
          }"
        ></div>
      </TransitionGroup>

      <!-- Card under the 3 (glass effect) - shown when top card is a 3 -->
      <div v-if="showGlassEffect && cardUnderThree" class="glass-card-wrapper">
        <PlayingCard
          :card="cardUnderThree"
          :face-down="faceDown"
          :disabled="true"
          class="glass-under-card"
        />
      </div>

      <!-- Top card with animation (only for discard pile) -->
      <Transition :name="cardPlayTransition" mode="out-in">
        <div :key="topCard?.id" class="top-card-wrapper" :class="{ 'burning-edges': aboutToBurn && showEffects, 'glass-top-card': isTopCardGlass && showEffects }">
          <PlayingCard
            :card="topCard"
            :face-down="faceDown"
            :disabled="true"
            class="top-card"
          />

          <!-- Special card effect overlays (only for discard pile) -->
          <div v-if="showSpecialEffect && showEffects" class="special-effect" :class="specialEffectClass">
            <div class="effect-ring"></div>
            <div class="effect-ring delay-1"></div>
            <div class="effect-ring delay-2"></div>
            <span class="effect-icon">{{ specialEffectIcon }}</span>
          </div>
        </div>
      </Transition>
    </div>

    <div v-else class="empty-pile">
      <span class="empty-text">{{ emptyText }}</span>
    </div>

    <Transition name="count-pop">
      <div v-if="showCount && cards.length > 0" :key="cards.length" class="pile-count">
        {{ cards.length }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Card } from '@/types';
import { SPECIAL_CARDS } from '@/types';
import PlayingCard from './PlayingCard.vue';

const props = defineProps<{
  cards: Card[];
  faceDown?: boolean;
  showCount?: boolean;
  emptyText?: string;
  clickable?: boolean;
  maxStackLayers?: number;
  showEffects?: boolean;
  playedFromBottom?: boolean; // true = human player (animate from bottom), false = AI (animate from top)
}>();

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const showSpecialEffect = ref(false);
const lastSpecialCard = ref<number | null>(null);

const topCard = computed(() => {
  if (props.cards.length === 0) return undefined;
  return props.cards[props.cards.length - 1];
});

// Determine animation direction based on who played the card
const cardPlayTransition = computed(() => {
  if (!props.showEffects) return '';
  return props.playedFromBottom ? 'card-play-from-bottom' : 'card-play-from-top';
});

// Check if the top card is a 3 (glass card)
const isTopCardGlass = computed(() => {
  return topCard.value?.rank === SPECIAL_CARDS.THREE;
});

// Get the card under the 3 (for glass effect display)
const cardUnderThree = computed(() => {
  if (!isTopCardGlass.value || props.cards.length < 2) return undefined;

  // Find the first non-3 card under the top 3
  for (let i = props.cards.length - 2; i >= 0; i--) {
    if (props.cards[i].rank !== SPECIAL_CARDS.THREE) {
      return props.cards[i];
    }
  }
  return undefined; // All cards are 3s
});

// Show the glass effect when top card is a 3 and there's a card underneath
const showGlassEffect = computed(() => {
  return props.showEffects && isTopCardGlass.value && cardUnderThree.value;
});

const stackLayers = computed(() => {
  const max = props.maxStackLayers ?? 5;
  return Math.min(props.cards.length - 1, max);
});

// Check if there are 3 same-rank cards on top (about to burn with 4th)
// Now also looks through 3's (glass cards) for non-3 cards
const aboutToBurn = computed(() => {
  if (props.cards.length < 3) return false;

  // Find the top non-3 card to determine what rank we're checking
  let targetRank: number | null = null;
  let matchCount = 0;

  for (let i = props.cards.length - 1; i >= 0; i--) {
    const card = props.cards[i];

    if (targetRank === null) {
      // First card determines what we're looking for
      if (card.rank === SPECIAL_CARDS.THREE) {
        // If top card is a 3, check for consecutive 3's only
        targetRank = SPECIAL_CARDS.THREE;
        matchCount = 1;
      } else if (card.rank === SPECIAL_CARDS.TEN) {
        // 10s burn immediately, no warning needed
        return false;
      } else {
        targetRank = card.rank;
        matchCount = 1;
      }
    } else if (targetRank === SPECIAL_CARDS.THREE) {
      // Looking for consecutive 3's
      if (card.rank === SPECIAL_CARDS.THREE) {
        matchCount++;
        if (matchCount >= 3) return true;
      } else {
        break;
      }
    } else {
      // Looking for other rank, skip 3's
      if (card.rank === targetRank) {
        matchCount++;
        if (matchCount >= 3) return true;
      } else if (card.rank === SPECIAL_CARDS.THREE) {
        // Skip 3's (glass cards)
        continue;
      } else {
        break;
      }
    }
  }

  return matchCount >= 3;
});

const specialEffectClass = computed(() => {
  switch (lastSpecialCard.value) {
    case SPECIAL_CARDS.TWO: return 'effect-reset';
    case SPECIAL_CARDS.THREE: return 'effect-glass';
    case SPECIAL_CARDS.SEVEN: return 'effect-cap';
    case SPECIAL_CARDS.TEN: return 'effect-burn';
    case SPECIAL_CARDS.JACK: return 'effect-reverse';
    default: return '';
  }
});

const specialEffectIcon = computed(() => {
  switch (lastSpecialCard.value) {
    case SPECIAL_CARDS.TWO: return '🔄';
    case SPECIAL_CARDS.THREE: return '👻';
    case SPECIAL_CARDS.SEVEN: return '⬇️';
    case SPECIAL_CARDS.TEN: return '🔥';
    case SPECIAL_CARDS.JACK: return '🔃';
    default: return '';
  }
});

// Watch for special cards being played (only if showEffects is enabled)
watch(() => topCard.value, (newCard, oldCard) => {
  if (!props.showEffects) return;

  if (newCard && newCard.id !== oldCard?.id) {
    const rank = newCard.rank;
    if (rank === SPECIAL_CARDS.TWO || rank === SPECIAL_CARDS.THREE ||
        rank === SPECIAL_CARDS.SEVEN || rank === SPECIAL_CARDS.TEN ||
        rank === SPECIAL_CARDS.JACK) {
      lastSpecialCard.value = rank;
      showSpecialEffect.value = true;
      setTimeout(() => {
        showSpecialEffect.value = false;
      }, 1500);
    }
  }
});

function handleClick() {
  if (props.clickable) {
    emit('click');
  }
}
</script>

<style scoped>
.card-pile {
  position: relative;
  width: 70px;
  height: 98px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.card-pile.clickable {
  cursor: pointer;
}

.pile-stack {
  position: relative;
  width: 60px;
  height: 84px;
}

.stack-layer {
  position: absolute;
  width: 60px;
  height: 84px;
  background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Stack layer animation */
.stack-layer-enter-active {
  transition: all 0.3s ease-out;
}

.stack-layer-leave-active {
  transition: all 0.2s ease-in;
}

.stack-layer-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.stack-layer-leave-to {
  opacity: 0;
}

.top-card-wrapper {
  position: relative;
  z-index: 10;
  border-radius: 6px;
}

.top-card {
  position: relative;
}

/* Card play animation - from top (AI/opponent plays) */
.card-play-from-top-enter-active {
  animation: card-fly-in-from-top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card-play-from-top-leave-active {
  animation: card-fade-out 0.15s ease-out;
}

@keyframes card-fly-in-from-top {
  0% {
    opacity: 0;
    transform: translateY(-100px) scale(0.5) rotate(-15deg);
  }
  60% {
    opacity: 1;
    transform: translateY(10px) scale(1.05) rotate(3deg);
  }
  100% {
    transform: translateY(0) scale(1) rotate(0deg);
  }
}

/* Card play animation - from bottom (human player plays) */
.card-play-from-bottom-enter-active {
  animation: card-fly-in-from-bottom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card-play-from-bottom-leave-active {
  animation: card-fade-out 0.15s ease-out;
}

@keyframes card-fly-in-from-bottom {
  0% {
    opacity: 0;
    transform: translateY(100px) scale(0.5) rotate(15deg);
  }
  60% {
    opacity: 1;
    transform: translateY(-10px) scale(1.05) rotate(-3deg);
  }
  100% {
    transform: translateY(0) scale(1) rotate(0deg);
  }
}

@keyframes card-fade-out {
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}

/* Special effect overlay */
.special-effect {
  position: absolute;
  inset: -20px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 100;
}

.effect-ring {
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 3px solid currentColor;
  animation: ring-expand 1s ease-out forwards;
  opacity: 0;
}

.effect-ring.delay-1 {
  animation-delay: 0.15s;
}

.effect-ring.delay-2 {
  animation-delay: 0.3s;
}

@keyframes ring-expand {
  0% {
    transform: scale(0.3);
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

.effect-icon {
  font-size: 40px;
  animation: icon-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5));
}

@keyframes icon-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Effect colors */
.effect-reset {
  color: #2196f3;
}

.effect-reset .effect-icon {
  animation: icon-spin 0.6s ease-out;
}

@keyframes icon-spin {
  0% {
    transform: scale(0) rotate(-180deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

.effect-glass {
  color: #9c27b0;
}

.effect-glass .effect-ring {
  border-style: dashed;
}

.effect-glass .effect-icon {
  animation: icon-ghost 1s ease-out;
}

@keyframes icon-ghost {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  25% {
    opacity: 0.3;
    transform: scale(1.1);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
  75% {
    opacity: 0.3;
    transform: scale(1.1);
  }
}

.effect-cap {
  color: #ff9800;
}

.effect-cap .effect-icon {
  animation: icon-bounce-down 0.6s ease-out;
}

@keyframes icon-bounce-down {
  0% {
    transform: translateY(-30px) scale(0);
  }
  60% {
    transform: translateY(5px) scale(1.1);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

.effect-burn {
  color: #f44336;
}

.effect-burn .effect-ring {
  border-width: 4px;
  background: radial-gradient(circle, rgba(255, 100, 0, 0.3) 0%, transparent 70%);
}

.effect-burn .effect-icon {
  animation: icon-flame 0.8s ease-out;
}

@keyframes icon-flame {
  0% {
    transform: scale(0) translateY(20px);
  }
  30% {
    transform: scale(1.5) translateY(-10px);
  }
  100% {
    transform: scale(1) translateY(0);
  }
}

.effect-reverse {
  color: #4caf50;
}

.effect-reverse .effect-ring {
  border-width: 3px;
  border-style: solid;
}

.effect-reverse .effect-icon {
  animation: icon-reverse-spin 0.8s ease-out;
}

@keyframes icon-reverse-spin {
  0% {
    transform: scale(0) rotate(0deg);
  }
  50% {
    transform: scale(1.3) rotate(180deg);
  }
  100% {
    transform: scale(1) rotate(360deg);
  }
}

/* ==================== GLASS EFFECT (Card under 3) ==================== */
.glass-card-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 5;
  transform: translateY(-8px) scale(0.92);
  opacity: 0.7;
}

.glass-under-card {
  filter: brightness(0.9) saturate(0.8);
}

.top-card-wrapper.glass-top-card {
  position: relative;
}

.top-card-wrapper.glass-top-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 6px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.05) 50%,
    rgba(255, 255, 255, 0.1) 100%
  );
  pointer-events: none;
  z-index: 100;
}

.top-card-wrapper.glass-top-card::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 5px;
  border: 1px solid rgba(156, 39, 176, 0.3);
  box-shadow:
    inset 0 0 10px rgba(156, 39, 176, 0.1),
    0 0 8px rgba(156, 39, 176, 0.2);
  pointer-events: none;
  z-index: 101;
  animation: glass-shimmer 2s ease-in-out infinite;
}

@keyframes glass-shimmer {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.empty-pile {
  width: 60px;
  height: 84px;
  border: 2px dashed rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  padding: 4px;
}

.pile-count {
  position: absolute;
  bottom: 0;
  right: -8px;
  background: var(--ion-color-primary);
  color: white;
  font-size: 11px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  z-index: 20;
}

/* Count pop animation */
.count-pop-enter-active {
  animation: count-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes count-pop {
  0% {
    transform: scale(1.5);
  }
  100% {
    transform: scale(1);
  }
}

/* ==================== ABOUT TO BURN EFFECTS ==================== */
.card-pile.about-to-burn {
  filter: drop-shadow(0 0 8px rgba(255, 100, 0, 0.6));
}

.burn-warning {
  position: absolute;
  inset: -15px;
  pointer-events: none;
  z-index: 50;
}

/* Smoke particles */
.smoke-container {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
}

.smoke {
  position: absolute;
  bottom: 70%;
  width: 20px;
  height: 20px;
  background: radial-gradient(circle, rgba(100, 100, 100, 0.6) 0%, transparent 70%);
  border-radius: 50%;
  animation: smoke-rise 2s ease-out infinite;
  animation-delay: var(--delay);
  opacity: 0;
  transform: translateX(var(--x));
}

@keyframes smoke-rise {
  0% {
    opacity: 0;
    transform: translateX(var(--x)) translateY(0) scale(0.5);
  }
  20% {
    opacity: 0.7;
  }
  100% {
    opacity: 0;
    transform: translateX(calc(var(--x) + 10px)) translateY(-60px) scale(1.5);
  }
}

/* Ember edges */
.ember-edges {
  position: absolute;
  inset: 15px;
  pointer-events: none;
}

.ember-edge {
  position: absolute;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(255, 100, 0, 0.8) 20%,
    rgba(255, 200, 0, 1) 50%,
    rgba(255, 100, 0, 0.8) 80%,
    transparent 100%
  );
  animation: ember-flicker 0.15s ease-in-out infinite alternate;
}

.ember-edge.top {
  top: 0;
  left: 10%;
  right: 10%;
  height: 3px;
  border-radius: 2px;
}

.ember-edge.bottom {
  bottom: 0;
  left: 10%;
  right: 10%;
  height: 3px;
  border-radius: 2px;
}

.ember-edge.left {
  left: 0;
  top: 10%;
  bottom: 10%;
  width: 3px;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(255, 100, 0, 0.8) 20%,
    rgba(255, 200, 0, 1) 50%,
    rgba(255, 100, 0, 0.8) 80%,
    transparent 100%
  );
  border-radius: 2px;
}

.ember-edge.right {
  right: 0;
  top: 10%;
  bottom: 10%;
  width: 3px;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(255, 100, 0, 0.8) 20%,
    rgba(255, 200, 0, 1) 50%,
    rgba(255, 100, 0, 0.8) 80%,
    transparent 100%
  );
  border-radius: 2px;
}

@keyframes ember-flicker {
  0% {
    opacity: 0.7;
    filter: blur(1px);
  }
  100% {
    opacity: 1;
    filter: blur(0px);
  }
}

/* Card wrapper burning effect */
.top-card-wrapper.burning-edges {
  animation: card-heat 0.5s ease-in-out infinite alternate;
}

.top-card-wrapper.burning-edges::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 10px;
  background: linear-gradient(45deg,
    rgba(255, 50, 0, 0.8),
    rgba(255, 150, 0, 0.6),
    rgba(255, 200, 0, 0.8),
    rgba(255, 150, 0, 0.6),
    rgba(255, 50, 0, 0.8)
  );
  background-size: 300% 300%;
  animation: fire-gradient 1s ease infinite;
  z-index: -1;
  filter: blur(3px);
}

@keyframes card-heat {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.02);
  }
}

@keyframes fire-gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>
