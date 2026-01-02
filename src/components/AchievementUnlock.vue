<template>
  <Teleport to="body">
    <Transition name="achievement">
      <div v-if="currentAchievement" class="achievement-overlay" @click="dismiss">
        <div class="achievement-popup" @click.stop>
          <!-- Confetti/sparkle particles -->
          <div class="particles">
            <div
              v-for="i in 20"
              :key="i"
              class="particle"
              :style="{
                '--delay': `${Math.random() * 0.5}s`,
                '--x': `${(Math.random() - 0.5) * 200}px`,
                '--y': `${(Math.random() - 0.5) * 200}px`,
                '--rotation': `${Math.random() * 360}deg`,
                '--color': particleColors[i % particleColors.length]
              }"
            >✨</div>
          </div>

          <div class="unlock-badge">
            <div class="badge-glow"></div>
            <div class="badge-emoji">{{ currentAchievement.emoji }}</div>
          </div>

          <div class="unlock-text">Achievement Unlocked!</div>
          <div class="unlock-name">{{ currentAchievement.name }}</div>
          <div class="unlock-description">{{ currentAchievement.description }}</div>

          <button class="dismiss-button" @click="dismiss">Nice! 🎉</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useAchievementStore } from '@/stores/achievementStore';
import { soundService } from '@/services/soundService';
import type { Achievement } from '@/types/achievements';

const achievementStore = useAchievementStore();
const currentAchievement = ref<Achievement | null>(null);
const particleColors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#a855f7', '#22c55e'];

let checkInterval: ReturnType<typeof setInterval> | null = null;

function checkForPendingUnlocks(): void {
  if (currentAchievement.value) return; // Already showing one

  const next = achievementStore.popPendingUnlock();
  if (next) {
    currentAchievement.value = next;
    soundService.play('achievement');
  }
}

function dismiss(): void {
  currentAchievement.value = null;
  // Check for more pending unlocks after a short delay
  setTimeout(checkForPendingUnlocks, 300);
}

onMounted(() => {
  // Check periodically for new unlocks
  checkInterval = setInterval(checkForPendingUnlocks, 500);
});

onUnmounted(() => {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
});

// Also check when pending unlocks change
watch(() => achievementStore.pendingUnlocks.length, () => {
  if (!currentAchievement.value) {
    checkForPendingUnlocks();
  }
});
</script>

<style scoped>
.achievement-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 20px;
}

.achievement-popup {
  background: linear-gradient(145deg, #2a2a4a, #1a1a2e);
  border-radius: 24px;
  padding: 40px 32px;
  text-align: center;
  position: relative;
  max-width: 320px;
  width: 100%;
  border: 2px solid rgba(255, 215, 0, 0.3);
  box-shadow:
    0 0 60px rgba(255, 215, 0, 0.3),
    0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: visible;
}

.particles {
  position: absolute;
  top: 50%;
  left: 50%;
  pointer-events: none;
}

.particle {
  position: absolute;
  font-size: 20px;
  animation: particle-burst 1s ease-out forwards;
  animation-delay: var(--delay);
  opacity: 0;
}

@keyframes particle-burst {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translate(
      calc(-50% + var(--x)),
      calc(-50% + var(--y))
    ) rotate(var(--rotation)) scale(1);
    opacity: 0;
  }
}

.unlock-badge {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-glow {
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, transparent 70%);
  border-radius: 50%;
  animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.2); opacity: 1; }
}

.badge-emoji {
  font-size: 72px;
  position: relative;
  z-index: 1;
  animation: badge-bounce 0.6s ease-out;
  filter: drop-shadow(0 4px 20px rgba(255, 215, 0, 0.5));
}

@keyframes badge-bounce {
  0% { transform: scale(0) rotate(-20deg); }
  50% { transform: scale(1.2) rotate(10deg); }
  70% { transform: scale(0.9) rotate(-5deg); }
  100% { transform: scale(1) rotate(0deg); }
}

.unlock-text {
  font-size: 14px;
  color: rgba(255, 215, 0, 0.9);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 8px;
  font-weight: 600;
}

.unlock-name {
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin-bottom: 12px;
}

.unlock-description {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
  margin-bottom: 28px;
}

.dismiss-button {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  border: none;
  border-radius: 12px;
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dismiss-button:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4);
}

.dismiss-button:active {
  transform: scale(0.98);
}

/* Transition */
.achievement-enter-active {
  animation: overlay-in 0.3s ease-out;
}

.achievement-leave-active {
  animation: overlay-out 0.2s ease-in;
}

@keyframes overlay-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes overlay-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.achievement-enter-active .achievement-popup {
  animation: popup-in 0.4s ease-out;
}

.achievement-leave-active .achievement-popup {
  animation: popup-out 0.2s ease-in;
}

@keyframes popup-in {
  from {
    opacity: 0;
    transform: scale(0.5) translateY(50px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes popup-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.8);
  }
}
</style>
