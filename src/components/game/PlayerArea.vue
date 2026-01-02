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
          :locked="!canPlayFaceDown && !isOpponent && player.faceUp.length > 0"
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
          :locked="!canPlayFaceUp && !isOpponent"
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
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.player-area.is-current {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 200, 100, 0.5);
  box-shadow:
    0 0 20px rgba(255, 180, 80, 0.2),
    inset 0 0 20px rgba(255, 255, 255, 0.05);
}

.player-area.is-opponent {
  background: rgba(0, 0, 0, 0.2);
  padding: 6px;
  overflow: hidden;
  border-radius: 12px;
}

.player-area.is-opponent.is-current {
  background: rgba(255, 200, 100, 0.15);
  border-color: rgba(255, 180, 80, 0.4);
}

.player-area.is-opponent .player-name {
  font-size: 11px;
  margin-bottom: 4px;
}

.player-area.is-opponent .table-cards {
  gap: 2px;
  margin-bottom: 4px;
}

.player-area.is-opponent .card-slot {
  width: 30px;
  height: 42px;
}

.player-area.is-opponent .card-slot :deep(.playing-card) {
  transform: scale(0.5);
  transform-origin: top left;
}

.player-area.is-opponent .face-up-card {
  top: 2px;
  left: 2px;
}

.player-area.is-opponent .opponent-hand :deep(.playing-card) {
  width: 24px;
  height: 34px;
}

.player-area.is-opponent .opponent-card {
  width: 24px !important;
  height: 34px !important;
  margin-left: -12px;
}

.player-name {
  font-weight: bold;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.turn-indicator {
  font-size: 11px;
  font-weight: 600;
  background: linear-gradient(135deg, #FFB74D 0%, #FF9800 100%);
  color: #3E2723;
  padding: 3px 10px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.4);
  animation: pulse-soft 2s ease-in-out infinite;
}

@keyframes pulse-soft {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.02); }
}

.out-indicator {
  font-size: 11px;
  font-weight: 600;
  background: linear-gradient(135deg, #81C784 0%, #4CAF50 100%);
  color: white;
  padding: 3px 10px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.4);
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
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.1);
}

.hand-section {
  margin-top: 8px;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  min-height: 100px; /* Fixed height to prevent layout jumping when cards change */
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
  right: -8px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
</style>
