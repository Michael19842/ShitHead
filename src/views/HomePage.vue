<template>
  <ion-page>
    <ion-content :fullscreen="true" class="home-content">
      <div class="home-container">
        <!-- Animated background cards -->
        <div class="bg-cards">
          <div class="bg-card" v-for="i in 6" :key="i" :style="{ '--delay': `${i * 0.5}s`, '--x': `${(i * 17) % 100}%` }"></div>
        </div>

        <div class="logo-section">
          <div class="logo-emoji">
            <span class="poop-icon">💩</span>
            <div class="logo-glow"></div>
          </div>
          <h1 class="game-title">
            <span class="title-letter" v-for="(letter, i) in 'SHITHEAD'" :key="i" :style="{ '--i': i }">{{ letter }}</span>
          </h1>
          <p class="game-subtitle">Het ultieme kaartspel</p>
          <div class="card-icons">
            <span class="card-suit">♠</span>
            <span class="card-suit red">♥</span>
            <span class="card-suit">♣</span>
            <span class="card-suit red">♦</span>
          </div>
        </div>

        <div class="menu-buttons">
          <ion-button expand="block" size="large" @click="router.push('/setup')" class="play-button">
            <ion-icon slot="start" :icon="playCircle"></ion-icon>
            Nieuw Spel
          </ion-button>

          <ion-button expand="block" size="large" fill="outline" @click="router.push('/rules')" class="menu-button">
            <ion-icon slot="start" :icon="bookOutline"></ion-icon>
            Spelregels
          </ion-button>

          <ion-button expand="block" size="large" fill="outline" @click="router.push('/settings')" class="menu-button">
            <ion-icon slot="start" :icon="settingsOutline"></ion-icon>
            Instellingen
          </ion-button>
        </div>

        <div class="footer-text">
          <p>Wees niet de laatste met kaarten!</p>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonPage, IonButton, IonIcon } from '@ionic/vue';
import { playCircle, bookOutline, settingsOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<style scoped>
.home-content {
  --background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.home-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  padding: 2rem;
  gap: 2rem;
  position: relative;
  overflow: hidden;
}

/* Animated background cards */
.bg-cards {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.bg-card {
  position: absolute;
  width: 60px;
  height: 84px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  left: var(--x);
  animation: float-card 20s ease-in-out infinite;
  animation-delay: var(--delay);
  opacity: 0.3;
}

@keyframes float-card {
  0%, 100% {
    transform: translateY(100vh) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 0.3;
  }
  90% {
    opacity: 0.3;
  }
  100% {
    transform: translateY(-100px) rotate(360deg);
    opacity: 0;
  }
}

/* Logo section */
.logo-section {
  text-align: center;
  z-index: 1;
}

.logo-emoji {
  position: relative;
  display: inline-block;
  margin-bottom: 1rem;
}

.poop-icon {
  font-size: 80px;
  display: block;
  animation: poop-bounce 2s ease-in-out infinite;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
}

@keyframes poop-bounce {
  0%, 100% {
    transform: translateY(0) rotate(-5deg);
  }
  50% {
    transform: translateY(-15px) rotate(5deg);
  }
}

.logo-glow {
  position: absolute;
  inset: -20px;
  background: radial-gradient(circle, rgba(139, 69, 19, 0.4) 0%, transparent 70%);
  animation: glow-pulse 2s ease-in-out infinite;
  z-index: -1;
}

@keyframes glow-pulse {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.game-title {
  font-size: 3.5rem;
  font-weight: 900;
  margin: 0;
  letter-spacing: 0.15em;
  display: flex;
  justify-content: center;
}

.title-letter {
  display: inline-block;
  background: linear-gradient(180deg, #ffd700 0%, #ff8c00 50%, #ff6347 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: letter-wave 3s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.1s);
  text-shadow: none;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

@keyframes letter-wave {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.game-subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0.5rem 0 1rem 0;
  font-style: italic;
}

.card-icons {
  display: flex;
  justify-content: center;
  gap: 1rem;
  font-size: 2rem;
}

.card-suit {
  color: #333;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
  animation: suit-rotate 4s ease-in-out infinite;
}

.card-suit:nth-child(1) { animation-delay: 0s; }
.card-suit:nth-child(2) { animation-delay: 0.5s; }
.card-suit:nth-child(3) { animation-delay: 1s; }
.card-suit:nth-child(4) { animation-delay: 1.5s; }

.card-suit.red {
  color: #c62828;
}

@keyframes suit-rotate {
  0%, 100% {
    transform: rotateY(0deg);
  }
  50% {
    transform: rotateY(180deg);
  }
}

/* Menu buttons */
.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 300px;
  z-index: 1;
}

.play-button {
  --background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
  --background-hover: linear-gradient(135deg, #66bb6a 0%, #388e3c 100%);
  --border-radius: 16px;
  --box-shadow: 0 8px 20px rgba(76, 175, 80, 0.4);
  font-weight: bold;
  font-size: 1.1rem;
  height: 56px;
}

.play-button::part(native) {
  transition: transform 0.2s, box-shadow 0.2s;
}

.play-button:hover::part(native) {
  transform: translateY(-2px);
}

.menu-button {
  --border-radius: 16px;
  --border-width: 2px;
  --border-color: rgba(255, 255, 255, 0.3);
  --color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  height: 50px;
  backdrop-filter: blur(10px);
  --background: rgba(255, 255, 255, 0.1);
}

.menu-button:hover {
  --background: rgba(255, 255, 255, 0.2);
}

/* Footer */
.footer-text {
  position: absolute;
  bottom: 2rem;
  text-align: center;
  z-index: 1;
}

.footer-text p {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  margin: 0;
}
</style>
