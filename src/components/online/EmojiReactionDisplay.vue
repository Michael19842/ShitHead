<template>
  <div class="emoji-reaction-container">
    <TransitionGroup name="emoji-float">
      <div
        v-for="reaction in activeReactions"
        :key="reaction.id"
        class="floating-emoji"
        :style="{ left: reaction.x + '%' }"
      >
        {{ reaction.emoji }}
        <span class="emoji-sender">{{ reaction.playerName }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import type { GameReaction } from '@/types';

interface ActiveReaction {
  id: string;
  emoji: string;
  playerName: string;
  x: number;
}

const props = defineProps<{
  reactions: GameReaction[];
  playerNames: Record<string, string>;
}>();

const activeReactions = ref<ActiveReaction[]>([]);
const processedIds = new Set<string>();

// Watch for new reactions
watch(() => props.reactions, (newReactions) => {
  for (const reaction of newReactions) {
    const reactionId = `${reaction.playerId}-${reaction.timestamp.getTime()}`;

    if (!processedIds.has(reactionId)) {
      processedIds.add(reactionId);

      // Add to active reactions
      const activeReaction: ActiveReaction = {
        id: reactionId,
        emoji: reaction.emoji,
        playerName: props.playerNames[reaction.playerId] || 'Speler',
        x: 20 + Math.random() * 60 // Random position between 20% and 80%
      };

      activeReactions.value.push(activeReaction);

      // Remove after animation
      setTimeout(() => {
        const index = activeReactions.value.findIndex(r => r.id === reactionId);
        if (index !== -1) {
          activeReactions.value.splice(index, 1);
        }
      }, 3000);
    }
  }

  // Clean up old processed IDs (keep last 50)
  if (processedIds.size > 100) {
    const idsArray = Array.from(processedIds);
    for (let i = 0; i < 50; i++) {
      processedIds.delete(idsArray[i]);
    }
  }
}, { deep: true });

onUnmounted(() => {
  activeReactions.value = [];
  processedIds.clear();
});
</script>

<style scoped>
.emoji-reaction-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1000;
  overflow: hidden;
}

.floating-emoji {
  position: absolute;
  bottom: 30%;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 48px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.emoji-sender {
  font-size: 12px;
  color: white;
  background: rgba(0, 0, 0, 0.6);
  padding: 2px 8px;
  border-radius: 10px;
  margin-top: 4px;
}

/* Float animation */
.emoji-float-enter-active {
  animation: float-up 3s ease-out forwards;
}

.emoji-float-leave-active {
  animation: fade-out 0.3s ease-out forwards;
}

@keyframes float-up {
  0% {
    transform: translateY(0) scale(0.5);
    opacity: 0;
  }
  10% {
    transform: translateY(-20px) scale(1.2);
    opacity: 1;
  }
  20% {
    transform: translateY(-40px) scale(1);
  }
  80% {
    opacity: 1;
  }
  100% {
    transform: translateY(-200px) scale(0.8);
    opacity: 0;
  }
}

@keyframes fade-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
</style>
