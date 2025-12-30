<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Shithead</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="confirmQuit">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="game-content">
      <div class="game-container">
        <!-- BURN ANIMATION OVERLAY -->
        <Transition name="burn-overlay">
          <div v-if="showBurnAnimation" class="burn-overlay">
            <div class="burn-container">
              <!-- Fire particles -->
              <div class="fire-particles">
                <div v-for="i in 30" :key="i" class="particle" :style="getParticleStyle(i)"></div>
              </div>

              <!-- Main fire -->
              <div class="fire">
                <div class="fire-main">
                  <div class="main-fire"></div>
                  <div class="particle-fire"></div>
                </div>
                <div class="fire-bottom">
                  <div class="main-fire"></div>
                </div>
              </div>

              <!-- Burn text -->
              <div class="burn-text">
                <span class="burn-letter" v-for="(letter, i) in 'BURN!'" :key="i" :style="{ animationDelay: `${i * 0.1}s` }">
                  {{ letter }}
                </span>
              </div>

              <!-- Embers -->
              <div class="embers">
                <div v-for="i in 20" :key="i" class="ember" :style="getEmberStyle(i)"></div>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Game message overlay -->
        <Transition name="message">
          <div v-if="gameMessage && !showBurnAnimation" class="game-message" :class="gameMessageClass">
            <span class="message-icon" v-if="messageIcon">{{ messageIcon }}</span>
            {{ gameMessage }}
          </div>
        </Transition>

        <!-- Swapping phase UI -->
        <div v-if="gameStore.phase === GamePhase.SWAPPING" class="swapping-phase">
          <div class="swap-instructions">
            <h3>Ruil je kaarten</h3>
            <p>Tap op een handkaart en dan op een open kaart om te ruilen.</p>
            <p>Als je klaar bent, druk op "Start Spel"</p>
          </div>

          <!-- Human player's swapping area -->
          <div class="swap-area">
            <div class="swap-section">
              <h4>Je hand</h4>
              <CardHand
                :cards="humanPlayer?.hand || []"
                :selected-cards="swapHandCard ? [swapHandCard] : []"
                :sorted="true"
                @select="selectSwapHandCard"
              />
            </div>

            <div class="swap-section">
              <h4>Open kaarten</h4>
              <div class="face-up-row">
                <PlayingCard
                  v-for="card in humanPlayer?.faceUp || []"
                  :key="card.id"
                  :card="card"
                  :selected="swapFaceUpCard?.id === card.id"
                  @click="selectSwapFaceUpCard(card)"
                />
              </div>
            </div>
          </div>

          <ion-button expand="block" @click="startGame" class="start-button">
            Start Spel
          </ion-button>
        </div>

        <!-- Main game area (playing phase) -->
        <div v-else-if="gameStore.phase === GamePhase.PLAYING" class="play-area">
          <!-- Opponents (top section) -->
          <div class="opponents-section">
            <TransitionGroup name="opponent">
              <div
                v-for="player in opponents"
                :key="player.id"
                class="opponent-wrapper"
              >
                <PlayerArea
                  :player="player"
                  :is-current-player="player.id === gameStore.currentPlayer?.id"
                  :is-opponent="true"
                  :selected-cards="[]"
                  :discard-pile="gameStore.discardPile"
                  :deck-empty="gameStore.deck.length === 0"
                  :player-phase="getPlayerPhase(player)"
                />
              </div>
            </TransitionGroup>
          </div>

          <!-- Center play area -->
          <div class="center-area">
            <!-- Draw pile -->
            <div class="pile-wrapper deck-pile">
              <span class="pile-label">Deck</span>
              <CardPile
                :cards="gameStore.deck"
                :face-down="true"
                :show-count="true"
                empty-text="Leeg"
              />
            </div>

            <!-- Discard pile -->
            <div class="pile-wrapper discard-pile" :class="{ 'can-pickup': canPickup }">
              <span class="pile-label">Aflegstapel</span>
              <CardPile
                :cards="gameStore.discardPile"
                :face-down="false"
                :show-count="true"
                empty-text="Leg kaart"
                :clickable="canPickup"
                @click="pickupPile"
              />
              <Transition name="indicator">
                <div v-if="isSevenActive" class="seven-indicator">
                  <span class="indicator-icon">7️⃣</span> of lager!
                </div>
              </Transition>
            </div>

            <!-- Burn pile -->
            <Transition name="pile-appear">
              <div class="pile-wrapper burn-pile" v-if="gameStore.burnPile.length > 0">
                <span class="pile-label">Verbrand</span>
                <CardPile
                  :cards="gameStore.burnPile"
                  :face-down="true"
                  :show-count="true"
                  empty-text=""
                />
                <div class="burn-glow"></div>
              </div>
            </Transition>
          </div>

          <!-- Action buttons -->
          <Transition name="buttons">
            <div class="action-buttons" v-if="isHumanTurn && !aiThinking">
              <ion-button
                :disabled="!canPlaySelected"
                @click="playSelectedCards"
                color="success"
                class="play-button"
              >
                <ion-icon :icon="checkmarkCircle" slot="start"></ion-icon>
                Speel {{ gameStore.selectedCards.length > 0 ? `(${gameStore.selectedCards.length})` : '' }}
              </ion-button>
              <ion-button
                :disabled="!canPickup"
                @click="pickupPile"
                color="warning"
                class="pickup-button"
              >
                <ion-icon :icon="handLeft" slot="start"></ion-icon>
                Pak stapel
              </ion-button>
            </div>
          </Transition>

          <!-- AI thinking indicator -->
          <Transition name="thinking">
            <div v-if="aiThinking" class="ai-thinking">
              <div class="thinking-dots">
                <span></span><span></span><span></span>
              </div>
              <span class="thinking-text">{{ gameStore.currentPlayer?.name }} denkt na...</span>
            </div>
          </Transition>

          <!-- Current human player -->
          <div class="human-player-section" v-if="humanPlayer">
            <PlayerArea
              :player="humanPlayer"
              :is-current-player="humanPlayer.id === gameStore.currentPlayer?.id"
              :is-opponent="false"
              :selected-cards="gameStore.selectedCards"
              :discard-pile="gameStore.discardPile"
              :deck-empty="gameStore.deck.length === 0"
              :player-phase="getPlayerPhase(humanPlayer)"
              @select-card="selectCard"
              @play-face-down="playFaceDown"
            />
          </div>
        </div>

        <!-- Game over -->
        <Transition name="game-over">
          <div v-if="gameStore.phase === GamePhase.ENDED" class="game-over">
            <div class="game-over-content">
              <div class="trophy">💩</div>
              <h2>Spel Afgelopen!</h2>
              <p v-if="gameStore.loser" class="loser-text">
                <span class="loser-name">{{ gameStore.loser.name }}</span>
                <span class="loser-title">is de Shithead!</span>
              </p>
              <ion-button @click="goToGameOver" expand="block" class="results-button">
                Bekijk Resultaten
              </ion-button>
            </div>
          </div>
        </Transition>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon,
  alertController
} from '@ionic/vue';
import { closeOutline, checkmarkCircle, handLeft } from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/gameStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { ref, computed, onMounted } from 'vue';
import type { Card, Player, PlayerPhase } from '@/types';
import { GamePhase } from '@/types';
import PlayerArea from '@/components/game/PlayerArea.vue';
import CardPile from '@/components/game/CardPile.vue';
import CardHand from '@/components/game/CardHand.vue';
import PlayingCard from '@/components/game/PlayingCard.vue';
import {
  initializeGame,
  canPlayCards,
  executePlay,
  executeBlindPlay,
  executePickup,
  willCauseBurn,
  getPlayerPhase as getPhase,
  isGameOver,
  getNextPlayerIndex
} from '@/services/gameEngine';
import { calculateMove, getAIThinkingDelay } from '@/services/aiPlayer';

const router = useRouter();
const gameStore = useGameStore();
const settingsStore = useSettingsStore();

// Local state
const gameMessage = ref<string | null>(null);
const gameMessageClass = ref('');
const messageIcon = ref<string | null>(null);
const aiThinking = ref(false);
const swapHandCard = ref<Card | null>(null);
const swapFaceUpCard = ref<Card | null>(null);
const showBurnAnimation = ref(false);

// Computed
const humanPlayer = computed(() =>
  gameStore.players.find(p => !p.isAI)
);

const opponents = computed(() =>
  gameStore.players.filter(p => p.isAI)
);

const isHumanTurn = computed(() => {
  if (!gameStore.currentPlayer || !humanPlayer.value) return false;
  return gameStore.currentPlayer.id === humanPlayer.value.id && !humanPlayer.value.isOut;
});

const isSevenActive = computed(() => gameStore.isSevenActive);

const canPlaySelected = computed(() => {
  if (!isHumanTurn.value || gameStore.selectedCards.length === 0) return false;
  return canPlayCards(gameStore.selectedCards, gameStore.discardPile);
});

const canPickup = computed(() => {
  if (!isHumanTurn.value) return false;
  return gameStore.discardPile.length > 0;
});

// Particle style generators for burn animation
function getParticleStyle(index: number) {
  const angle = (index / 30) * 360;
  const delay = Math.random() * 0.5;
  const duration = 0.5 + Math.random() * 0.5;
  const distance = 50 + Math.random() * 100;

  return {
    '--angle': `${angle}deg`,
    '--delay': `${delay}s`,
    '--duration': `${duration}s`,
    '--distance': `${distance}px`,
    '--size': `${4 + Math.random() * 8}px`,
    '--color': `hsl(${Math.random() * 40 + 10}, 100%, ${50 + Math.random() * 30}%)`
  };
}

function getEmberStyle(index: number) {
  const x = -100 + Math.random() * 200;
  const delay = Math.random() * 1;
  const duration = 1 + Math.random() * 2;

  return {
    '--x': `${x}px`,
    '--delay': `${delay}s`,
    '--duration': `${duration}s`,
    '--size': `${2 + Math.random() * 4}px`
  };
}

// Methods
function getPlayerPhase(player: Player): PlayerPhase {
  return getPhase(player, gameStore.deck.length === 0);
}

function selectCard(card: Card) {
  if (!isHumanTurn.value) return;
  gameStore.selectCard(card);
}

function selectSwapHandCard(card: Card) {
  swapHandCard.value = swapHandCard.value?.id === card.id ? null : card;

  if (swapHandCard.value && swapFaceUpCard.value && humanPlayer.value) {
    gameStore.swapCards(humanPlayer.value, swapHandCard.value, swapFaceUpCard.value);
    swapHandCard.value = null;
    swapFaceUpCard.value = null;
  }
}

function selectSwapFaceUpCard(card: Card) {
  swapFaceUpCard.value = swapFaceUpCard.value?.id === card.id ? null : card;

  if (swapHandCard.value && swapFaceUpCard.value && humanPlayer.value) {
    gameStore.swapCards(humanPlayer.value, swapHandCard.value, swapFaceUpCard.value);
    swapHandCard.value = null;
    swapFaceUpCard.value = null;
  }
}

function startGame() {
  gameStore.startPlaying();
  showMessage('Spel gestart!', 'info', '🎮');

  if (gameStore.currentPlayer?.isAI) {
    scheduleAITurn();
  }
}

async function triggerBurnAnimation() {
  showBurnAnimation.value = true;
  await new Promise(resolve => setTimeout(resolve, 2000));
  showBurnAnimation.value = false;
}

async function playSelectedCards() {
  if (!canPlaySelected.value || !humanPlayer.value) return;

  const cards = [...gameStore.selectedCards];

  const result = executePlay(
    humanPlayer.value,
    cards,
    gameStore.discardPile,
    gameStore.deck
  );

  gameStore.clearSelection();

  if (!result.success) {
    showMessage(result.message || 'Ongeldige zet', 'error', '❌');
    return;
  }

  if (result.burned) {
    await triggerBurnAnimation();
    gameStore.clearDiscard();
    checkPlayerStatus(humanPlayer.value);
    return;
  }

  if (result.playerOut) {
    showMessage(`${humanPlayer.value.name} is klaar!`, 'success', '🎉');
    gameStore.setPlayerOut(humanPlayer.value.id);

    if (isGameOver(gameStore.players)) {
      endGame();
      return;
    }
  }

  nextTurn();
}

async function pickupPile() {
  if (!canPickup.value || !humanPlayer.value) return;

  const pickedUp = executePickup(humanPlayer.value, gameStore.discardPile);
  gameStore.discardPile = [];

  showMessage(`${pickedUp.length} kaarten gepakt`, 'warning', '✋');

  nextTurn();
}

async function playFaceDown(index: number) {
  if (!isHumanTurn.value || !humanPlayer.value) return;

  const phase = getPlayerPhase(humanPlayer.value);
  if (phase !== 'FACE_DOWN') return;

  const result = executeBlindPlay(humanPlayer.value, index, gameStore.discardPile);

  if (!result.success) {
    showMessage(result.message || 'Fout', 'error', '❌');
    return;
  }

  showMessage(`Gespeeld: ${result.card.rank}`, 'info', '🎴');

  if (result.mustPickup) {
    const allCards = [...gameStore.discardPile, result.card];
    humanPlayer.value.hand.push(...allCards);
    gameStore.discardPile = [];
    showMessage('Niet speelbaar - Stapel gepakt!', 'warning', '😅');
    nextTurn();
    return;
  }

  if (result.burned) {
    await triggerBurnAnimation();
    gameStore.clearDiscard();
    checkPlayerStatus(humanPlayer.value);
    return;
  }

  if (result.playerOut) {
    showMessage(`${humanPlayer.value.name} is klaar!`, 'success', '🎉');
    gameStore.setPlayerOut(humanPlayer.value.id);

    if (isGameOver(gameStore.players)) {
      endGame();
      return;
    }
  }

  nextTurn();
}

function checkPlayerStatus(player: Player) {
  if (player.hand.length === 0 && player.faceUp.length === 0 && player.faceDown.length === 0) {
    gameStore.setPlayerOut(player.id);
    showMessage(`${player.name} is klaar!`, 'success', '🎉');

    if (isGameOver(gameStore.players)) {
      endGame();
      return true;
    }
  }
  return false;
}

function nextTurn() {
  const nextIndex = getNextPlayerIndex(gameStore.currentPlayerIndex, gameStore.players);
  gameStore.setCurrentPlayer(nextIndex);

  gameStore.clearSelection();

  if (gameStore.currentPlayer?.isAI && !gameStore.currentPlayer.isOut) {
    scheduleAITurn();
  }
}

function scheduleAITurn() {
  aiThinking.value = true;
  const delay = getAIThinkingDelay(settingsStore.aiDifficulty);

  setTimeout(() => {
    executeAITurn();
  }, delay);
}

async function executeAITurn() {
  const player = gameStore.currentPlayer;
  if (!player || !player.isAI || player.isOut) {
    aiThinking.value = false;
    return;
  }

  const move = calculateMove(
    player,
    gameStore.discardPile,
    gameStore.deck.length === 0,
    settingsStore.aiDifficulty
  );

  aiThinking.value = false;

  if (move.type === 'pickup') {
    const pickedUp = executePickup(player, gameStore.discardPile);
    gameStore.discardPile = [];
    showMessage(`${player.name} pakt ${pickedUp.length} kaarten`, 'warning', '🤖');
    nextTurn();
    return;
  }

  if (move.type === 'blind' && move.blindIndex !== undefined) {
    const result = executeBlindPlay(player, move.blindIndex, gameStore.discardPile);

    if (result.mustPickup) {
      const allCards = [...gameStore.discardPile, result.card];
      player.hand.push(...allCards);
      gameStore.discardPile = [];
      showMessage(`${player.name} pakte stapel`, 'warning', '🤖');
      nextTurn();
      return;
    }

    showMessage(`${player.name} speelt blinde kaart`, 'info', '🎴');

    if (result.burned) {
      await triggerBurnAnimation();
      gameStore.clearDiscard();
      if (!checkPlayerStatus(player)) {
        scheduleAITurn();
      }
      return;
    }

    if (result.playerOut) {
      gameStore.setPlayerOut(player.id);
      if (isGameOver(gameStore.players)) {
        endGame();
        return;
      }
    }

    nextTurn();
    return;
  }

  if (move.type === 'play' && move.cards) {
    const result = executePlay(
      player,
      move.cards,
      gameStore.discardPile,
      gameStore.deck
    );

    if (!result.success) {
      const pickedUp = executePickup(player, gameStore.discardPile);
      gameStore.discardPile = [];
      showMessage(`${player.name} pakt stapel`, 'warning', '🤖');
      nextTurn();
      return;
    }

    const cardCount = move.cards.length;
    showMessage(`${player.name} speelt ${cardCount}x`, 'info', '🤖');

    if (result.burned) {
      await triggerBurnAnimation();
      gameStore.clearDiscard();
      if (!checkPlayerStatus(player)) {
        scheduleAITurn();
      }
      return;
    }

    if (result.playerOut) {
      gameStore.setPlayerOut(player.id);
      if (isGameOver(gameStore.players)) {
        endGame();
        return;
      }
    }

    nextTurn();
  }
}

function endGame() {
  showMessage('Spel afgelopen!', 'success', '🏆');
}

function goToGameOver() {
  router.push('/game-over');
}

function showMessage(message: string, type: 'info' | 'success' | 'warning' | 'error', icon?: string) {
  gameMessage.value = message;
  gameMessageClass.value = `message-${type}`;
  messageIcon.value = icon || null;

  setTimeout(() => {
    gameMessage.value = null;
    messageIcon.value = null;
  }, 1500);
}

async function confirmQuit() {
  const alert = await alertController.create({
    header: 'Spel verlaten?',
    message: 'Weet je zeker dat je het spel wilt verlaten?',
    buttons: [
      { text: 'Annuleren', role: 'cancel' },
      { text: 'Verlaten', role: 'destructive', handler: () => {
        gameStore.resetGame();
        router.push('/home');
      }}
    ]
  });
  await alert.present();
}

onMounted(() => {
  if (gameStore.players.length === 0) {
    const result = initializeGame(
      settingsStore.playerCount,
      settingsStore.playerNames,
      settingsStore.humanPlayerCount
    );

    gameStore.initGame(result.players, result.deck, result.deckCount);
  }
});
</script>

<style scoped>
.game-content {
  --background: linear-gradient(135deg, #1a5f1a 0%, #0d3d0d 100%);
}

.game-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px;
  position: relative;
  overflow: hidden;
}

/* ==================== BURN ANIMATION ==================== */
.burn-overlay {
  position: fixed;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255, 100, 0, 0.3) 0%, rgba(0, 0, 0, 0.9) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.burn-container {
  position: relative;
  width: 300px;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Fire particles flying outward */
.fire-particles {
  position: absolute;
  width: 100%;
  height: 100%;
}

.particle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--size);
  height: var(--size);
  background: var(--color);
  border-radius: 50%;
  animation: particle-fly var(--duration) ease-out var(--delay) forwards;
  box-shadow: 0 0 10px var(--color), 0 0 20px var(--color);
}

@keyframes particle-fly {
  0% {
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(var(--distance) * -1));
    opacity: 0;
  }
}

/* Main fire effect */
.fire {
  position: absolute;
  width: 150px;
  height: 200px;
}

.fire-main {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 100%;
}

.main-fire {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 150px;
  background: linear-gradient(to top, #ff6600, #ff9933, #ffcc00, transparent);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  animation: fire-flicker 0.3s ease-in-out infinite alternate;
  filter: blur(2px);
}

.particle-fire {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 50px;
  height: 100px;
  background: linear-gradient(to top, #ff3300, #ff6600, transparent);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  animation: fire-flicker 0.2s ease-in-out infinite alternate-reverse;
  filter: blur(1px);
}

@keyframes fire-flicker {
  0% {
    transform: translateX(-50%) scaleY(1) scaleX(1);
  }
  100% {
    transform: translateX(-50%) scaleY(1.1) scaleX(0.9);
  }
}

.fire-bottom {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 40px;
}

.fire-bottom .main-fire {
  width: 120px;
  height: 40px;
  background: radial-gradient(ellipse at center, #ff3300 0%, #ff6600 50%, transparent 70%);
  filter: blur(5px);
}

/* Burn text */
.burn-text {
  position: absolute;
  font-size: 72px;
  font-weight: 900;
  color: #fff;
  text-shadow:
    0 0 20px #ff6600,
    0 0 40px #ff3300,
    0 0 60px #ff0000,
    0 0 80px #ff0000;
  animation: burn-text-glow 0.5s ease-in-out infinite alternate;
  display: flex;
}

.burn-letter {
  display: inline-block;
  animation: burn-letter-jump 0.5s ease-in-out infinite;
}

@keyframes burn-letter-jump {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-10px) scale(1.1);
  }
}

@keyframes burn-text-glow {
  0% {
    text-shadow:
      0 0 20px #ff6600,
      0 0 40px #ff3300,
      0 0 60px #ff0000;
  }
  100% {
    text-shadow:
      0 0 30px #ff9900,
      0 0 60px #ff6600,
      0 0 90px #ff3300,
      0 0 120px #ff0000;
  }
}

/* Embers rising */
.embers {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.ember {
  position: absolute;
  bottom: 0;
  left: calc(50% + var(--x));
  width: var(--size);
  height: var(--size);
  background: #ff6600;
  border-radius: 50%;
  animation: ember-rise var(--duration) ease-out var(--delay) infinite;
  box-shadow: 0 0 6px #ff6600;
}

@keyframes ember-rise {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-300px) scale(0);
    opacity: 0;
  }
}

/* Burn overlay transitions */
.burn-overlay-enter-active {
  animation: burn-in 0.3s ease-out;
}

.burn-overlay-leave-active {
  animation: burn-out 0.5s ease-in;
}

@keyframes burn-in {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes burn-out {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* ==================== GAME MESSAGES ==================== */
.game-message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 16px 32px;
  border-radius: 16px;
  font-size: 20px;
  font-weight: bold;
  z-index: 1000;
  text-align: center;
  display: flex;
  align-items: center;
  gap: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.message-icon {
  font-size: 28px;
}

.message-info {
  background: rgba(33, 33, 33, 0.95);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.message-success {
  background: linear-gradient(135deg, rgba(46, 125, 50, 0.95), rgba(27, 94, 32, 0.95));
  color: white;
  border: 2px solid rgba(129, 199, 132, 0.5);
}

.message-warning {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.95), rgba(230, 126, 0, 0.95));
  color: black;
  border: 2px solid rgba(255, 204, 128, 0.5);
}

.message-error {
  background: linear-gradient(135deg, rgba(211, 47, 47, 0.95), rgba(183, 28, 28, 0.95));
  color: white;
  border: 2px solid rgba(239, 154, 154, 0.5);
}

.message-enter-active {
  animation: message-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.message-leave-active {
  animation: message-out 0.3s ease-in;
}

@keyframes message-in {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5) translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) translateY(0);
  }
}

@keyframes message-out {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8) translateY(-20px);
  }
}

/* ==================== SWAPPING PHASE ==================== */
.swapping-phase {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  animation: fade-in 0.5s ease-out;
}

.swap-instructions {
  text-align: center;
  color: white;
  margin-bottom: 16px;
}

.swap-instructions h3 {
  margin: 0 0 8px 0;
  font-size: 24px;
}

.swap-instructions p {
  margin: 4px 0;
  font-size: 14px;
  opacity: 0.9;
}

.swap-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.swap-section {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  padding: 16px;
  backdrop-filter: blur(5px);
}

.swap-section h4 {
  color: white;
  margin: 0 0 12px 0;
  text-align: center;
  font-size: 16px;
}

.face-up-row {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.start-button {
  margin-top: 16px;
  --border-radius: 12px;
  font-weight: bold;
  font-size: 18px;
}

/* ==================== PLAY AREA ==================== */
.play-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: fade-in 0.5s ease-out;
}

@keyframes fade-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.opponents-section {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.opponent-wrapper {
  flex: 1;
  max-width: 200px;
  min-width: 150px;
}

.opponent-enter-active,
.opponent-leave-active {
  transition: all 0.3s ease;
}

.opponent-enter-from,
.opponent-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* ==================== CENTER AREA ==================== */
.center-area {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 20px;
  margin: 8px 0;
  backdrop-filter: blur(5px);
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.3);
}

.pile-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
}

.pile-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.discard-pile.can-pickup :deep(.card-pile) {
  cursor: pointer;
  transition: transform 0.2s;
}

.discard-pile.can-pickup:hover :deep(.card-pile) {
  transform: scale(1.05);
}

.seven-indicator {
  position: absolute;
  bottom: -28px;
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: white;
  font-size: 11px;
  font-weight: bold;
  padding: 4px 12px;
  border-radius: 12px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 10px rgba(255, 152, 0, 0.5);
  animation: pulse-glow 1s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 2px 10px rgba(255, 152, 0, 0.5);
  }
  50% {
    box-shadow: 0 2px 20px rgba(255, 152, 0, 0.8);
  }
}

.indicator-icon {
  font-size: 14px;
}

.indicator-enter-active,
.indicator-leave-active {
  transition: all 0.3s ease;
}

.indicator-enter-from,
.indicator-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.burn-pile {
  position: relative;
}

.burn-glow {
  position: absolute;
  inset: -10px;
  background: radial-gradient(circle, rgba(255, 100, 0, 0.3) 0%, transparent 70%);
  animation: burn-glow-pulse 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes burn-glow-pulse {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

.pile-appear-enter-active {
  animation: pile-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pile-appear-leave-active {
  animation: pile-shrink 0.2s ease-in;
}

@keyframes pile-pop {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pile-shrink {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0);
  }
}

/* ==================== ACTION BUTTONS ==================== */
.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding: 12px;
}

.action-buttons ion-button {
  --border-radius: 12px;
  font-weight: bold;
  min-width: 140px;
}

.play-button {
  --box-shadow: 0 4px 15px rgba(46, 125, 50, 0.4);
}

.pickup-button {
  --box-shadow: 0 4px 15px rgba(255, 152, 0, 0.4);
}

.buttons-enter-active {
  animation: buttons-in 0.3s ease-out;
}

.buttons-leave-active {
  animation: buttons-out 0.2s ease-in;
}

@keyframes buttons-in {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes buttons-out {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-20px);
  }
}

/* ==================== AI THINKING ==================== */
.ai-thinking {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  color: white;
  font-size: 16px;
}

.thinking-dots {
  display: flex;
  gap: 4px;
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: thinking-bounce 1.4s ease-in-out infinite;
}

.thinking-dots span:nth-child(1) {
  animation-delay: 0s;
}

.thinking-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes thinking-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.thinking-text {
  font-weight: 500;
}

.thinking-enter-active {
  animation: thinking-in 0.3s ease-out;
}

.thinking-leave-active {
  animation: thinking-out 0.2s ease-in;
}

@keyframes thinking-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes thinking-out {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* ==================== HUMAN PLAYER ==================== */
.human-player-section {
  margin-top: auto;
}

/* ==================== GAME OVER ==================== */
.game-over {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
}

.game-over-content {
  text-align: center;
  color: white;
  padding: 32px;
}

.trophy {
  font-size: 80px;
  animation: trophy-bounce 1s ease-in-out infinite;
}

@keyframes trophy-bounce {
  0%, 100% {
    transform: translateY(0) rotate(-5deg);
  }
  50% {
    transform: translateY(-20px) rotate(5deg);
  }
}

.game-over h2 {
  font-size: 36px;
  margin: 16px 0;
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.loser-text {
  margin-bottom: 32px;
}

.loser-name {
  display: block;
  font-size: 28px;
  font-weight: bold;
  color: #ff6b6b;
  margin-bottom: 8px;
}

.loser-title {
  font-size: 20px;
  opacity: 0.9;
}

.results-button {
  --border-radius: 12px;
  font-weight: bold;
  font-size: 18px;
}

.game-over-enter-active {
  animation: game-over-in 0.5s ease-out;
}

@keyframes game-over-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
</style>
