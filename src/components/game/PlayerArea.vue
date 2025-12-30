<template>
  <div class="player-area" :class="{ 'is-current': isCurrentPlayer, 'is-opponent': isOpponent }">
    <div class="player-name">
      {{ player.name }}
      <span v-if="isCurrentPlayer" class="turn-indicator">Aan de beurt</span>
      <span v-if="player.isOut" class="out-indicator">Klaar!</span>
    </div>

    <!-- Table cards (face-down with face-up on top) -->
    <div class="table-cards">
      <div v-for="i in 4" :key="i" class="card-slot">
        <!-- Face-down card (bottom) -->
        <PlayingCard
          v-if="player.faceDown[i - 1]"
          :card="player.faceDown[i - 1]"
          :face-down="true"
          :disabled="!canPlayFaceDown"
          class="face-down-card"
          @click="$emit('playFaceDown', i - 1)"
        />
        <div v-else class="empty-slot"></div>

        <!-- Face-up card (top) -->
        <PlayingCard
          v-if="player.faceUp[i - 1]"
          :card="player.faceUp[i - 1]"
          :selected="isSelected(player.faceUp[i - 1])"
          :playable="canPlayFaceUp && isPlayable(player.faceUp[i - 1])"
          :disabled="!canPlayFaceUp"
          class="face-up-card"
          @click="handleCardClick(player.faceUp[i - 1])"
        />
      </div>
    </div>

    <!-- Hand cards -->
    <div v-if="!isOpponent && player.hand.length > 0" class="hand-section">
      <CardHand
        :cards="player.hand"
        :selected-cards="selectedCards"
        :playable-ranks="playableRanks"
        :disabled="!canPlayHand"
        :sorted="true"
        @select="handleCardClick"
      />
    </div>

    <!-- Opponent hand (hidden) -->
    <div v-if="isOpponent && player.hand.length > 0" class="opponent-hand">
      <PlayingCard
        v-for="(_, index) in player.hand"
        :key="index"
        :face-down="true"
        :disabled="true"
        class="opponent-card"
      />
      <span class="hand-count">{{ player.hand.length }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Card, Player, PlayerPhase } from '@/types';
import PlayingCard from './PlayingCard.vue';
import CardHand from './CardHand.vue';
import { canPlayCards } from '@/services/gameEngine';

const props = defineProps<{
  player: Player;
  isCurrentPlayer?: boolean;
  isOpponent?: boolean;
  selectedCards?: Card[];
  discardPile?: Card[];
  deckEmpty?: boolean;
  playerPhase?: PlayerPhase;
}>();

const emit = defineEmits<{
  (e: 'selectCard', card: Card): void;
  (e: 'playFaceDown', index: number): void;
}>();

const canPlayHand = computed(() => {
  return props.isCurrentPlayer && props.playerPhase === 'HAND' && !props.player.isOut;
});

const canPlayFaceUp = computed(() => {
  return props.isCurrentPlayer && props.playerPhase === 'FACE_UP' && !props.player.isOut;
});

const canPlayFaceDown = computed(() => {
  return props.isCurrentPlayer && props.playerPhase === 'FACE_DOWN' && !props.player.isOut;
});

const playableRanks = computed(() => {
  if (!props.isCurrentPlayer || !props.discardPile) return [];

  const ranks: number[] = [];
  for (let rank = 2; rank <= 14; rank++) {
    if (canPlayCards([{ rank, suit: 'hearts', id: 'test' }], props.discardPile)) {
      ranks.push(rank);
    }
  }
  return ranks;
});

function isSelected(card: Card): boolean {
  return props.selectedCards?.some(c => c.id === card.id) ?? false;
}

function isPlayable(card: Card): boolean {
  return playableRanks.value.includes(card.rank);
}

function handleCardClick(card: Card | undefined) {
  if (card) {
    emit('selectCard', card);
  }
}
</script>

<style scoped>
.player-area {
  padding: 12px;
  border-radius: 12px;
  background: var(--ion-color-light);
  transition: background 0.3s;
}

.player-area.is-current {
  background: var(--ion-color-primary-tint);
  box-shadow: 0 0 0 2px var(--ion-color-primary);
}

.player-area.is-opponent {
  background: var(--ion-color-medium-tint);
}

.player-name {
  font-weight: bold;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.turn-indicator {
  font-size: 12px;
  background: var(--ion-color-primary);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
}

.out-indicator {
  font-size: 12px;
  background: var(--ion-color-success);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
}

.table-cards {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 12px;
}

.card-slot {
  position: relative;
  width: 60px;
  height: 84px;
}

.face-down-card {
  position: absolute;
  top: 0;
  left: 0;
}

.face-up-card {
  position: absolute;
  top: 4px;
  left: 4px;
}

.empty-slot {
  width: 60px;
  height: 84px;
  border: 1px dashed var(--ion-color-medium);
  border-radius: 6px;
}

.hand-section {
  margin-top: 8px;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
}

.opponent-hand {
  display: flex;
  justify-content: center;
  position: relative;
}

.opponent-card {
  width: 40px;
  height: 56px;
  margin-left: -20px;
}

.opponent-card:first-child {
  margin-left: 0;
}

.hand-count {
  position: absolute;
  right: -10px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--ion-color-dark);
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 10px;
}
</style>
