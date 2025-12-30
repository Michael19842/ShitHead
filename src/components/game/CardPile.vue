<template>
  <div class="card-pile" :class="{ 'clickable': clickable }" @click="handleClick">
    <div class="pile-stack" v-if="cards.length > 0">
      <!-- Stack shadow layers (underneath) -->
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

      <!-- Top card -->
      <PlayingCard
        :card="topCard"
        :face-down="faceDown"
        :disabled="true"
        class="top-card"
      />
    </div>

    <div v-else class="empty-pile">
      <span class="empty-text">{{ emptyText }}</span>
    </div>

    <div v-if="showCount && cards.length > 0" class="pile-count">
      {{ cards.length }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Card } from '@/types';
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

const topCard = computed(() => {
  if (props.cards.length === 0) return undefined;
  return props.cards[props.cards.length - 1];
});

const stackLayers = computed(() => {
  const max = props.maxStackLayers ?? 3;
  return Math.min(props.cards.length - 1, max);
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

.top-card {
  position: relative;
  z-index: 10;
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
</style>
