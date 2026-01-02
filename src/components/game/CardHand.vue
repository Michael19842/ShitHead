<template>
  <div class="card-hand" :class="{ 'compact': compact }">
    <TransitionGroup name="hand-card">
      <PlayingCard
        v-for="card in sortedCards"
        :key="card.id"
        :card="card"
        :face-down="faceDown"
        :selected="isSelected(card)"
        :playable="isPlayable(card)"
        :disabled="disabled"
        @click="handleCardClick"
      />
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Card } from '@/types';
import PlayingCard from './PlayingCard.vue';
import { sortCardsByRank } from '@/services/deckService';

const props = defineProps<{
  cards: Card[];
  selectedCards?: Card[];
  playableRanks?: number[];
  faceDown?: boolean;
  disabled?: boolean;
  compact?: boolean;
  sorted?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', card: Card): void;
}>();

const sortedCards = computed(() => {
  if (props.sorted) {
    return sortCardsByRank(props.cards);
  }
  return props.cards;
});

function isSelected(card: Card): boolean {
  return props.selectedCards?.some(c => c.id === card.id) ?? false;
}

function isPlayable(card: Card): boolean {
  if (!props.playableRanks || props.playableRanks.length === 0) {
    return false;
  }
  return props.playableRanks.includes(card.rank);
}

function handleCardClick(card: Card | undefined) {
  if (card && !props.disabled) {
    emit('select', card);
  }
}
</script>

<style scoped>
.card-hand {
  display: flex;
  justify-content: safe center;
  flex-wrap: nowrap;
  padding: 8px 16px;
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin; /* Firefox - show thin scrollbar */
  scrollbar-color: rgba(255,255,255,0.3) transparent;
  gap: 4px;
  width: 100%;
  box-sizing: border-box;
}

.card-hand::-webkit-scrollbar {
  height: 4px;
}

.card-hand::-webkit-scrollbar-track {
  background: transparent;
}

.card-hand::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.3);
  border-radius: 2px;
}

/* Overlap kaarten wanneer er veel zijn */
.card-hand :deep(.playing-card) {
  flex-shrink: 0;
  margin-left: -20px;
}

.card-hand :deep(.playing-card:first-child) {
  margin-left: 0;
}

/* Bij weinig kaarten: geen overlap nodig */
@media (min-width: 400px) {
  .card-hand :deep(.playing-card) {
    margin-left: -10px;
  }
}

.card-hand.compact {
  gap: 0;
}

.card-hand.compact :deep(.playing-card:not(:first-child)) {
  margin-left: -35px;
}

/* Card hand animations */
.hand-card-move {
  transition: transform 0.4s ease;
}

.hand-card-enter-active {
  animation: card-deal-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.hand-card-leave-active {
  animation: card-play-out 0.3s ease-out forwards;
  position: absolute;
}

@keyframes card-deal-in {
  0% {
    opacity: 0;
    transform: translateY(-50px) rotate(-10deg) scale(0.5);
  }
  100% {
    opacity: 1;
    transform: translateY(0) rotate(0) scale(1);
  }
}

@keyframes card-play-out {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-80px) scale(0.7);
  }
}
</style>
