<template>
  <div class="card-pile" :class="{ 'clickable': clickable }" @click="handleClick">
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

      <!-- Top card with animation -->
      <Transition name="card-play" mode="out-in">
        <div :key="topCard?.id" class="top-card-wrapper">
          <PlayingCard
            :card="topCard"
            :face-down="faceDown"
            :disabled="true"
            class="top-card"
          />

          <!-- Special card effect overlays -->
          <div v-if="showSpecialEffect" class="special-effect" :class="specialEffectClass">
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

const stackLayers = computed(() => {
  const max = props.maxStackLayers ?? 5;
  return Math.min(props.cards.length - 1, max);
});

const specialEffectClass = computed(() => {
  switch (lastSpecialCard.value) {
    case SPECIAL_CARDS.TWO: return 'effect-reset';
    case SPECIAL_CARDS.THREE: return 'effect-glass';
    case SPECIAL_CARDS.SEVEN: return 'effect-cap';
    case SPECIAL_CARDS.TEN: return 'effect-burn';
    default: return '';
  }
});

const specialEffectIcon = computed(() => {
  switch (lastSpecialCard.value) {
    case SPECIAL_CARDS.TWO: return '🔄';
    case SPECIAL_CARDS.THREE: return '👻';
    case SPECIAL_CARDS.SEVEN: return '⬇️';
    case SPECIAL_CARDS.TEN: return '🔥';
    default: return '';
  }
});

// Watch for special cards being played
watch(() => topCard.value, (newCard, oldCard) => {
  if (newCard && newCard.id !== oldCard?.id) {
    const rank = newCard.rank;
    if (rank === SPECIAL_CARDS.TWO || rank === SPECIAL_CARDS.THREE ||
        rank === SPECIAL_CARDS.SEVEN || rank === SPECIAL_CARDS.TEN) {
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
}

.top-card {
  position: relative;
}

/* Card play animation */
.card-play-enter-active {
  animation: card-fly-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card-play-leave-active {
  animation: card-fade-out 0.15s ease-out;
}

@keyframes card-fly-in {
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
</style>
