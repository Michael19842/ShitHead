<template>
  <div class="card-hand" :class="{ 'compact': compact }">
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
  justify-content: center;
  flex-wrap: nowrap;
  padding: 8px;
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
  gap: 4px;
}

.card-hand::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
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
@container (min-width: 400px) {
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
</style>
