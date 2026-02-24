<template>
  <transition name="splash-fade">
    <div v-if="visible" class="splash-screen">
      <!-- Animated background -->
      <div class="splash-bg">
        <div class="floating-card" v-for="i in 12" :key="i" :style="getCardStyle(i)">
          <span class="card-face">{{ getCardSymbol(i) }}</span>
        </div>
      </div>

      <!-- Main content -->
      <div class="splash-content">
        <!-- Animated poop logo -->
        <div class="logo-container">
          <div class="poop-bounce">
            <span class="poop-emoji">💩</span>
          </div>
          <div class="logo-ring"></div>
          <div class="logo-ring ring-2"></div>
          <div class="logo-ring ring-3"></div>
        </div>

        <!-- Title with letter animation -->
        <h1 class="splash-title">
          <span
            v-for="(letter, i) in 'SHITHEAD'"
            :key="i"
            class="title-letter"
            :style="{ animationDelay: `${0.8 + i * 0.1}s` }"
          >{{ letter }}</span>
        </h1>

        <!-- Subtitle -->
        <p class="splash-subtitle">Het ultieme kaartspel</p>

        <!-- Card suits animation -->
        <div class="suits-row">
          <span class="suit" :style="{ animationDelay: '1.5s' }">♠</span>
          <span class="suit red" :style="{ animationDelay: '1.6s' }">♥</span>
          <span class="suit" :style="{ animationDelay: '1.7s' }">♣</span>
          <span class="suit red" :style="{ animationDelay: '1.8s' }">♦</span>
        </div>

        <!-- Loading indicator -->
        <div class="loading-bar">
          <div class="loading-progress"></div>
        </div>

        <!-- Credits -->
        <p class="credits">MvR Open Projects</p>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const emit = defineEmits<{
  (e: 'complete'): void;
}>();

const visible = ref(true);

const cardSymbols = ['A♠', 'K♥', 'Q♣', 'J♦', '10♠', '2♥', '3♣', '7♦', 'A♥', 'K♠', 'Q♦', '10♣'];

function getCardSymbol(index: number): string {
  return cardSymbols[(index - 1) % cardSymbols.length];
}

function getCardStyle(index: number) {
  const angle = (index - 1) * 30;
  const delay = (index - 1) * 0.2;
  const distance = 120 + (index % 3) * 40;

  return {
    '--angle': `${angle}deg`,
    '--delay': `${delay}s`,
    '--distance': `${distance}px`,
    '--rotation': `${(index * 25) % 360}deg`
  };
}

onMounted(() => {
  // Hide splash after animation completes
  setTimeout(() => {
    visible.value = false;
    setTimeout(() => {
      emit('complete');
    }, 500); // Wait for fade out animation
  }, 3000); // Total splash duration
});
</script>

<style scoped>
.splash-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a2040 100%);
  overflow: hidden;
}

/* Background floating cards */
.splash-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.floating-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 50px;
  height: 70px;
  background: linear-gradient(135deg, #fff 0%, #e0e0e0 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  opacity: 0;
  animation: floatCard 3s ease-out var(--delay) forwards;
  transform: translate(-50%, -50%) rotate(var(--rotation));
}

.card-face {
  color: #1a1a2e;
}

.floating-card:nth-child(2n) .card-face {
  color: #e53935;
}

@keyframes floatCard {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(0deg) scale(0.5);
  }
  20% {
    opacity: 0.7;
  }
  100% {
    opacity: 0;
    transform:
      translate(
        calc(-50% + cos(var(--angle)) * var(--distance) * 3),
        calc(-50% + sin(var(--angle)) * var(--distance) * 3)
      )
      rotate(var(--rotation))
      scale(0.3);
  }
}

/* Main content */
.splash-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  z-index: 1;
}

/* Logo */
.logo-container {
  position: relative;
  width: 150px;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.poop-bounce {
  animation: poopBounce 0.6s ease-out forwards, poopPulse 2s ease-in-out 0.6s infinite;
}

.poop-emoji {
  font-size: 80px;
  filter: drop-shadow(0 10px 30px rgba(139, 90, 43, 0.5));
}

@keyframes poopBounce {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.2) rotate(10deg);
  }
  70% {
    transform: scale(0.9) rotate(-5deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

@keyframes poopPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* Logo rings */
.logo-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  animation: ringExpand 2s ease-out forwards;
}

.ring-2 {
  animation-delay: 0.2s;
}

.ring-3 {
  animation-delay: 0.4s;
}

@keyframes ringExpand {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

/* Title */
.splash-title {
  font-size: 3rem;
  font-weight: 900;
  margin: 0;
  display: flex;
  gap: 0.1em;
}

.title-letter {
  display: inline-block;
  color: white;
  text-shadow:
    0 0 10px rgba(255, 255, 255, 0.5),
    0 0 20px rgba(255, 255, 255, 0.3),
    0 4px 10px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transform: translateY(30px) rotateX(90deg);
  animation: letterDrop 0.4s ease-out forwards;
}

@keyframes letterDrop {
  0% {
    opacity: 0;
    transform: translateY(30px) rotateX(90deg);
  }
  100% {
    opacity: 1;
    transform: translateY(0) rotateX(0deg);
  }
}

/* Subtitle */
.splash-subtitle {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  opacity: 0;
  animation: fadeInUp 0.5s ease-out 1.6s forwards;
}

@keyframes fadeInUp {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Card suits */
.suits-row {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.suit {
  font-size: 2rem;
  color: white;
  opacity: 0;
  animation: suitPop 0.3s ease-out forwards;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.suit.red {
  color: #ff5252;
}

@keyframes suitPop {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  70% {
    transform: scale(1.3);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* Loading bar */
.loading-bar {
  width: 200px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-top: 2rem;
  overflow: hidden;
}

.loading-progress {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A, #4CAF50);
  background-size: 200% 100%;
  border-radius: 2px;
  animation: loadingBar 2.5s ease-in-out forwards, shimmer 1s linear infinite;
}

@keyframes loadingBar {
  0% {
    width: 0%;
  }
  100% {
    width: 100%;
  }
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Credits */
.credits {
  margin-top: 1.5rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0;
  animation: fadeInUp 0.5s ease-out 2s forwards;
}

/* Fade out transition */
.splash-fade-leave-active {
  transition: opacity 0.5s ease-out;
}

.splash-fade-leave-to {
  opacity: 0;
}
</style>
