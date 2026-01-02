<template>
  <ion-page>
    <AchievementUnlock />
    <ion-header>
      <ion-toolbar class="game-toolbar">
        <ion-title>
          <span class="header-logo">💩</span>
          Shithead
        </ion-title>
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

        <!-- DEVIL EFFECT OVERLAY (666 Easter Egg) -->
        <Transition name="devil-overlay">
          <div v-if="showDevilEffect" class="devil-overlay">
            <div class="devil-container">
              <div class="devil-horns">
                <div class="horn left"></div>
                <div class="horn right"></div>
              </div>
              <div class="devil-text">
                <span class="devil-six">6</span>
                <span class="devil-six">6</span>
                <span class="devil-six">6</span>
              </div>
              <div class="devil-emoji">😈</div>
            </div>
          </div>
        </Transition>

        <!-- Game message overlay -->
        <Transition name="message">
          <div v-if="gameMessage && !showBurnAnimation && !showDevilEffect" class="game-message" :class="gameMessageClass">
            <span class="message-icon" v-if="messageIcon">{{ messageIcon }}</span>
            {{ gameMessage }}
          </div>
        </Transition>

        <!-- Swapping phase UI -->
        <div v-if="gameStore.phase === GamePhase.SWAPPING" class="swapping-phase">
          <div class="swap-instructions">
            <h3>{{ bottomPlayer?.name || 'Laden...' }}: Ruil je kaarten</h3>
            <p>Tap op een handkaart en dan op een open kaart om te ruilen.</p>
            <p v-if="humanPlayers.length > 1">Speler {{ swappingPlayerIndex + 1 }} van {{ humanPlayers.length }}</p>
          </div>

          <!-- Human player's swapping area -->
          <div class="swap-area">
            <div class="swap-section">
              <h4>Je hand</h4>
              <CardHand
                :cards="bottomPlayer?.hand || []"
                :selected-cards="swapHandCard ? [swapHandCard] : []"
                :sorted="true"
                @select="selectSwapHandCard"
              />
            </div>

            <div class="swap-section">
              <h4>Open kaarten</h4>
              <div class="face-up-row">
                <PlayingCard
                  v-for="card in bottomPlayer?.faceUp || []"
                  :key="card.id"
                  :card="card"
                  :selected="swapFaceUpCard?.id === card.id"
                  @click="selectSwapFaceUpCard(card)"
                />
              </div>
            </div>
          </div>

          <ion-button
            v-if="swappingPlayerIndex < humanPlayers.length - 1"
            expand="block"
            @click="nextSwappingPlayer"
            class="start-button"
          >
            Volgende Speler
          </ion-button>
          <ion-button
            v-else
            expand="block"
            @click="startGame"
            class="start-button"
          >
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
                :show-effects="true"
                :played-from-bottom="lastPlayedByHuman"
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

            <!-- Burn pile - always reserve space to prevent layout jumping -->
            <div class="pile-wrapper burn-pile" :class="{ 'burn-pile-hidden': gameStore.burnPile.length === 0 }">
              <span class="pile-label">Verbrand</span>
              <CardPile
                :cards="gameStore.burnPile"
                :face-down="true"
                :show-count="true"
                empty-text=""
              />
              <div class="burn-glow" v-if="gameStore.burnPile.length > 0"></div>
            </div>
          </div>

          <!-- Action area wrapper - fixed height to prevent layout jumping -->
          <div class="action-area-wrapper">
            <!-- Action buttons -->
            <Transition name="buttons">
              <div class="action-buttons" v-if="isBottomPlayerTurn && !aiThinking && !showPassPhone">
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
          </div>

          <!-- Pass phone overlay voor meerdere menselijke spelers -->
          <Transition name="pass-phone">
            <div v-if="showPassPhone" class="pass-phone-overlay" @click="confirmPassPhone">
              <div class="pass-phone-content">
                <div class="pass-phone-icon">📱</div>
                <h2>Geef de telefoon aan</h2>
                <p class="next-player-name">{{ gameStore.currentPlayer?.name }}</p>
                <p class="tap-hint">Tap om door te gaan</p>
              </div>
            </div>
          </Transition>

          <!-- Current human player -->
          <div class="human-player-section" v-if="bottomPlayer">
            <PlayerArea
              :player="bottomPlayer"
              :is-current-player="isBottomPlayerTurn"
              :is-opponent="false"
              :selected-cards="gameStore.selectedCards"
              :discard-pile="gameStore.discardPile"
              :deck-empty="gameStore.deck.length === 0"
              :player-phase="getPlayerPhase(bottomPlayer)"
              @select-card="selectCard"
              @play-face-down="playFaceDown"
            />
          </div>
        </div>

        <!-- Game over -->
        <div v-else-if="gameStore.phase === GamePhase.ENDED" class="game-over">
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

        <!-- Fallback: Loading / Setup phase -->
        <div v-else class="loading-phase">
          <div class="loading-content">
            <div class="loading-icon">🃏</div>
            <p>Spel wordt geladen...</p>
            <p class="debug-info">Phase: {{ gameStore.phase }} | Players: {{ gameStore.players.length }}</p>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon,
  alertController, onIonViewWillEnter
} from '@ionic/vue';
import { closeOutline, checkmarkCircle, handLeft } from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { useGameStore } from '@/stores/gameStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { ref, computed } from 'vue';
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
  getNextPlayerIndex,
  getStartingPlayerAndCards
} from '@/services/gameEngine';
import { RANK_NAMES_EN, RANK_NAMES_NL, SPECIAL_CARDS } from '@/types';
import { calculateMove, getAIThinkingDelay } from '@/services/aiPlayer';
import { soundService } from '@/services/soundService';
import { useAchievementStore } from '@/stores/achievementStore';
import AchievementUnlock from '@/components/AchievementUnlock.vue';

const router = useRouter();
const gameStore = useGameStore();
const settingsStore = useSettingsStore();
const achievementStore = useAchievementStore();

// Local state
const gameMessage = ref<string | null>(null);
const gameMessageClass = ref('');
const messageIcon = ref<string | null>(null);
const aiThinking = ref(false);
const swapHandCard = ref<Card | null>(null);
const swapFaceUpCard = ref<Card | null>(null);
const showBurnAnimation = ref(false);
const showDevilEffect = ref(false); // Easter egg voor 666
const showPassPhone = ref(false); // Voor "geef telefoon door" scherm
const lastPlayedByHuman = ref(false); // Track if last card was played by human (for animation direction)
const swappingPlayerIndex = ref(0); // Welke menselijke speler aan het swappen is

// Achievement tracking
const gameStartTime = ref<number>(0);
const burnsThisGame = ref(0);
const pickedUpThisGame = ref(0);
const didPickupThisGame = ref(false);
const played2 = ref(false);
const played3 = ref(false);
const played7 = ref(false);
const playedQuad = ref(false);
const burnedWith4OfKind = ref(false);
const blindSuccess = ref(false);
const wonWithBlind = ref(false);

// Computed
// De huidige actieve menselijke speler (degene die nu speelt of aan de beurt is)
const activeHumanPlayer = computed(() => {
  const current = gameStore.currentPlayer;
  if (current && !current.isAI && !current.isOut) {
    return current;
  }
  // Als AI aan de beurt is, toon de eerste menselijke speler die niet uit is
  return gameStore.players.find(p => !p.isAI && !p.isOut) || null;
});

// Alle menselijke spelers (voor swapping fase)
const humanPlayers = computed(() =>
  gameStore.players.filter(p => !p.isAI)
);

// De speler die onderin het scherm wordt getoond
const bottomPlayer = computed(() => {
  if (gameStore.phase === GamePhase.SWAPPING) {
    return humanPlayers.value[swappingPlayerIndex.value] || null;
  }
  return activeHumanPlayer.value;
});

// Tegenstanders: alle spelers behalve de bottom player
const opponents = computed(() =>
  gameStore.players.filter(p => p.id !== bottomPlayer.value?.id)
);

const isHumanTurn = computed(() => {
  const current = gameStore.currentPlayer;
  if (!current) return false;
  return !current.isAI && !current.isOut;
});

// Is het de beurt van de speler die onderin staat?
const isBottomPlayerTurn = computed(() => {
  if (!bottomPlayer.value || !gameStore.currentPlayer) return false;
  return gameStore.currentPlayer.id === bottomPlayer.value.id;
});

const isSevenActive = computed(() => gameStore.isSevenActive);

const canPlaySelected = computed(() => {
  if (!isBottomPlayerTurn.value || gameStore.selectedCards.length === 0) return false;
  return canPlayCards(gameStore.selectedCards, gameStore.discardPile);
});

const canPickup = computed(() => {
  if (!isBottomPlayerTurn.value) return false;
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
  if (!isBottomPlayerTurn.value) return;
  gameStore.selectCard(card);
}

function selectSwapHandCard(card: Card) {
  swapHandCard.value = swapHandCard.value?.id === card.id ? null : card;

  if (swapHandCard.value && swapFaceUpCard.value && bottomPlayer.value) {
    gameStore.swapCards(bottomPlayer.value, swapHandCard.value, swapFaceUpCard.value);
    swapHandCard.value = null;
    swapFaceUpCard.value = null;
  }
}

function selectSwapFaceUpCard(card: Card) {
  swapFaceUpCard.value = swapFaceUpCard.value?.id === card.id ? null : card;

  if (swapHandCard.value && swapFaceUpCard.value && bottomPlayer.value) {
    gameStore.swapCards(bottomPlayer.value, swapHandCard.value, swapFaceUpCard.value);
    swapHandCard.value = null;
    swapFaceUpCard.value = null;
  }
}

function nextSwappingPlayer() {
  swapHandCard.value = null;
  swapFaceUpCard.value = null;
  swappingPlayerIndex.value++;
}

function confirmPassPhone() {
  showPassPhone.value = false;
}

function startGame() {
  // Determine who starts based on lowest card (first 4, then 5, etc.)
  const startingInfo = getStartingPlayerAndCards(gameStore.players);
  gameStore.setCurrentPlayer(startingInfo.playerIndex);

  gameStore.startPlaying();

  const startingPlayer = gameStore.players[startingInfo.playerIndex];
  const rankNames = settingsStore.cardLanguage === 'nl' ? RANK_NAMES_NL : RANK_NAMES_EN;
  const rankName = rankNames[startingInfo.startingRank] || startingInfo.startingRank.toString();
  const cardCount = startingInfo.startingCards.length;

  // Show message about who starts and with which card(s) they should play
  if (cardCount > 1) {
    showMessage(`${startingPlayer.name} begint met ${cardCount}x ${rankName}!`, 'info', '🎮');
  } else {
    showMessage(`${startingPlayer.name} begint met ${rankName}!`, 'info', '🎮');
  }

  // If starting player is AI, let them play
  if (startingPlayer.isAI) {
    scheduleAITurn();
  }
}

async function triggerBurnAnimation() {
  soundService.play('special-burn');
  showBurnAnimation.value = true;
  await new Promise(resolve => setTimeout(resolve, 2000));
  showBurnAnimation.value = false;
}

function triggerDevilEffect() {
  showDevilEffect.value = true;
  setTimeout(() => {
    showDevilEffect.value = false;
  }, 2500);
}

async function playSelectedCards() {
  if (!canPlaySelected.value || !bottomPlayer.value) return;

  const cards = [...gameStore.selectedCards];
  const player = bottomPlayer.value;

  // Mark that a human player is playing (for animation direction)
  lastPlayedByHuman.value = true;

  const result = executePlay(
    player,
    cards,
    gameStore.discardPile,
    gameStore.deck
  );

  gameStore.clearSelection();

  if (!result.success) {
    showMessage(result.message || 'Ongeldige zet', 'error', '❌');
    return;
  }

  // Play sound for the card(s) played
  const cardRank = cards[0].rank;
  soundService.playSpecialCard(cardRank);

  // Track special cards for achievements (only for human players)
  if (!player.isAI) {
    if (cardRank === 2) played2.value = true;
    if (cardRank === 3) played3.value = true;
    if (cardRank === 7) played7.value = true;
    if (cards.length >= 4) playedQuad.value = true;

    // Check for 666 (three sixes) - easter egg achievement
    if (cardRank === 6 && cards.length === 3) {
      achievementStore.unlock('play_666');
      triggerDevilEffect();
    }
  }

  // Reverse direction if Jack is played
  if (cardRank === SPECIAL_CARDS.JACK) {
    gameStore.reverseDirection();
    showMessage('Richting omgedraaid!', 'info', '🔃');
  }

  if (result.burned) {
    burnsThisGame.value++;
    // Check if burned with 4-of-a-kind (not a 10)
    if (!player.isAI && cardRank !== 10 && cards.length >= 4) {
      burnedWith4OfKind.value = true;
    }
    await triggerBurnAnimation();
    gameStore.clearDiscard();
    checkPlayerStatus(player);
    return;
  }

  if (result.playerOut) {
    soundService.play('player-out');
    showMessage(`${player.name} is klaar!`, 'success', '🎉');
    gameStore.setPlayerOut(player.id);

    if (isGameOver(gameStore.players)) {
      endGame();
      return;
    }
  }

  nextTurn();
}

async function pickupPile() {
  if (!canPickup.value || !bottomPlayer.value) return;

  soundService.play('pile-pickup');
  const pickedUp = executePickup(bottomPlayer.value, gameStore.discardPile);

  // Track pickup for achievements (only for human players)
  if (!bottomPlayer.value.isAI) {
    didPickupThisGame.value = true;
    pickedUpThisGame.value += pickedUp.length;
  }

  gameStore.discardPile = [];

  showMessage(`${pickedUp.length} kaarten gepakt`, 'warning', '✋');

  nextTurn();
}

async function playFaceDown(index: number) {
  if (!isBottomPlayerTurn.value || !bottomPlayer.value) return;

  const player = bottomPlayer.value;
  const phase = getPlayerPhase(player);
  if (phase !== 'FACE_DOWN') return;

  // Mark that a human player is playing (for animation direction)
  lastPlayedByHuman.value = true;

  const result = executeBlindPlay(player, index, gameStore.discardPile);

  if (!result.success) {
    showMessage(result.message || 'Fout', 'error', '❌');
    return;
  }

  soundService.playSpecialCard(result.card.rank);
  showMessage(`Gespeeld: ${result.card.rank}`, 'info', '🎴');

  // Track blind card play for achievements (only for human players)
  if (!player.isAI && !result.mustPickup) {
    blindSuccess.value = true;
  }

  // Reverse direction if Jack is played (blind)
  if (result.card.rank === SPECIAL_CARDS.JACK && !result.mustPickup) {
    gameStore.reverseDirection();
    showMessage('Richting omgedraaid!', 'info', '🔃');
  }

  if (result.mustPickup) {
    soundService.play('pile-pickup');
    const allCards = [...gameStore.discardPile, result.card];

    // Track pickup for achievements
    if (!player.isAI) {
      didPickupThisGame.value = true;
      pickedUpThisGame.value += allCards.length;
    }

    player.hand.push(...allCards);
    gameStore.discardPile = [];
    showMessage('Niet speelbaar - Stapel gepakt!', 'warning', '😅');
    nextTurn();
    return;
  }

  if (result.burned) {
    burnsThisGame.value++;
    await triggerBurnAnimation();
    gameStore.clearDiscard();
    checkPlayerStatus(player);
    return;
  }

  if (result.playerOut) {
    // Track winning with blind card
    if (!player.isAI) {
      wonWithBlind.value = true;
    }
    soundService.play('player-out');
    showMessage(`${player.name} is klaar!`, 'success', '🎉');
    gameStore.setPlayerOut(player.id);

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
    soundService.play('player-out');
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

  const nextPlayer = gameStore.currentPlayer;
  if (!nextPlayer || nextPlayer.isOut) return;

  if (nextPlayer.isAI) {
    scheduleAITurn();
  } else {
    // Menselijke speler aan de beurt
    soundService.play('your-turn');
    // Toon pass phone als er meerdere menselijke spelers zijn
    // en de volgende speler anders is dan de huidige bottom player
    if (humanPlayers.value.length > 1 && nextPlayer.id !== bottomPlayer.value?.id) {
      showPassPhone.value = true;
    }
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
    soundService.play('pile-pickup');
    const pickedUp = executePickup(player, gameStore.discardPile);
    gameStore.discardPile = [];
    showMessage(`${player.name} pakt ${pickedUp.length} kaarten`, 'warning', '🤖');
    nextTurn();
    return;
  }

  if (move.type === 'blind' && move.blindIndex !== undefined) {
    // Mark that AI is playing (for animation direction)
    lastPlayedByHuman.value = false;

    const result = executeBlindPlay(player, move.blindIndex, gameStore.discardPile);

    if (result.mustPickup) {
      soundService.play('pile-pickup');
      const allCards = [...gameStore.discardPile, result.card];
      player.hand.push(...allCards);
      gameStore.discardPile = [];
      showMessage(`${player.name} pakte stapel`, 'warning', '🤖');
      nextTurn();
      return;
    }

    soundService.playSpecialCard(result.card.rank);
    showMessage(`${player.name} speelt blinde kaart`, 'info', '🎴');

    // Reverse direction if Jack is played (AI blind)
    if (result.card.rank === SPECIAL_CARDS.JACK) {
      gameStore.reverseDirection();
    }

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
    // Mark that AI is playing (for animation direction)
    lastPlayedByHuman.value = false;

    const result = executePlay(
      player,
      move.cards,
      gameStore.discardPile,
      gameStore.deck
    );

    if (!result.success) {
      soundService.play('pile-pickup');
      const pickedUp = executePickup(player, gameStore.discardPile);
      gameStore.discardPile = [];
      showMessage(`${player.name} pakt stapel`, 'warning', '🤖');
      nextTurn();
      return;
    }

    const aiCardRank = move.cards[0].rank;
    soundService.playSpecialCard(aiCardRank);
    const cardCount = move.cards.length;
    showMessage(`${player.name} speelt ${cardCount}x`, 'info', '🤖');

    // Reverse direction if Jack is played
    if (aiCardRank === SPECIAL_CARDS.JACK) {
      gameStore.reverseDirection();
    }

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
  // Determine if any human player lost
  const loser = gameStore.players.find(p => !p.isOut);
  const humanLost = loser && !loser.isAI;
  const humanWon = !humanLost;

  if (humanLost) {
    soundService.play('game-lose');
  } else {
    soundService.play('game-win');
  }
  showMessage('Spel afgelopen!', 'success', '🏆');

  // Record achievements for human players
  const gameDuration = Date.now() - gameStartTime.value;
  achievementStore.recordGameResult({
    won: humanWon,
    isOnline: false,
    burnsInGame: burnsThisGame.value,
    pickedUpTotal: pickedUpThisGame.value,
    didPickup: didPickupThisGame.value,
    gameDurationMs: gameDuration,
    playedQuad: playedQuad.value,
    played2: played2.value,
    played3: played3.value,
    played7: played7.value,
    burnedWith4OfKind: burnedWith4OfKind.value,
    blindSuccess: blindSuccess.value,
    wonWithBlind: humanWon && wonWithBlind.value
  });
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

// Use onIonViewWillEnter instead of onMounted to handle Ionic page caching
onIonViewWillEnter(() => {
  // Initialize sound service (non-blocking)
  soundService.setEnabled(settingsStore.soundEnabled);
  soundService.init().then(() => {
    soundService.play('card-shuffle');
  });

  console.log('Settings before init:', {
    playerCount: settingsStore.playerCount,
    humanPlayerCount: settingsStore.humanPlayerCount,
    playerNames: settingsStore.playerNames
  });

  // Validate settings - use defaults if invalid
  const playerCount = settingsStore.playerCount || 2;
  const humanPlayerCount = settingsStore.humanPlayerCount || 1;
  const playerNames = settingsStore.playerNames?.length >= playerCount
    ? settingsStore.playerNames
    : Array.from({ length: playerCount }, (_, i) => i === 0 ? 'Speler 1' : `Computer ${i}`);

  // Reset swapping state
  swappingPlayerIndex.value = 0;
  swapHandCard.value = null;
  swapFaceUpCard.value = null;
  showPassPhone.value = false;
  showBurnAnimation.value = false;

  // Reset achievement tracking
  gameStartTime.value = Date.now();
  burnsThisGame.value = 0;
  pickedUpThisGame.value = 0;
  didPickupThisGame.value = false;
  played2.value = false;
  played3.value = false;
  played7.value = false;
  playedQuad.value = false;
  burnedWith4OfKind.value = false;
  blindSuccess.value = false;
  wonWithBlind.value = false;

  // Always reset and initialize a new game when entering GamePage
  gameStore.resetGame();

  const result = initializeGame(
    playerCount,
    playerNames,
    humanPlayerCount
  );
  gameStore.initGame(result.players, result.deck, result.deckCount);

  console.log('Game initialized:', {
    phase: gameStore.phase,
    players: gameStore.players.length,
    humanPlayers: gameStore.players.filter(p => !p.isAI).length
  });
});
</script>

<style scoped>
.game-toolbar {
  --background: linear-gradient(135deg, #6B4423 0%, #4a2f18 100%);
  --color: white;
}

.header-logo {
  font-size: 1.4rem;
  margin-right: 0.3rem;
  vertical-align: middle;
  display: inline-block;
  animation: poop-bounce 2s ease-in-out infinite;
}

@keyframes poop-bounce {
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-3px) rotate(5deg); }
}

.game-content {
  --background: #5D4E37;
}

/* Safe area voor Android navigatie knoppen */
.game-content::part(scroll) {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}

.game-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px;
  position: relative;
  overflow: hidden;

  /* Warme houten tafel achtergrond */
  background:
    /* Zachte vignet voor diepte */
    radial-gradient(
      ellipse at 50% 50%,
      transparent 0%,
      rgba(0, 0, 0, 0.15) 100%
    ),
    /* Warme gradient */
    linear-gradient(
      160deg,
      #7D6B5A 0%,
      #5D4E37 30%,
      #4A3D2A 70%,
      #3D3222 100%
    );
}

/* Speelse emoji decoraties in de hoeken */
.game-container::before {
  content: '🃏';
  position: absolute;
  top: 8px;
  left: 12px;
  font-size: 20px;
  opacity: 0.2;
  pointer-events: none;
  animation: card-float 4s ease-in-out infinite;
}

.game-container::after {
  content: '🎴';
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 20px;
  opacity: 0.2;
  pointer-events: none;
  animation: card-float 4s ease-in-out infinite reverse;
}

@keyframes card-float {
  0%, 100% { transform: translateY(0) rotate(-10deg); }
  50% { transform: translateY(-5px) rotate(10deg); }
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
  margin-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  --border-radius: 12px;
  font-weight: bold;
  font-size: 18px;
}

/* ==================== PLAY AREA ==================== */
.play-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  animation: fade-in 0.5s ease-out;
  min-height: 0; /* Belangrijk voor flex overflow */
  overflow: hidden;
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
  gap: 4px;
  justify-content: center;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: visible;
  padding: 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  min-height: 100px; /* Fixed minimum height to prevent layout jumping */
  flex-shrink: 0;
}

.opponents-section::-webkit-scrollbar {
  display: none;
}

.opponent-wrapper {
  flex: 0 0 auto;
  width: calc((100% - 12px) / 3); /* 3 opponents max, with gaps */
  min-width: 90px;
  max-width: 140px;
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
  gap: 16px;
  padding: 16px 20px;
  background:
    radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.08) 0%, transparent 70%),
    rgba(0, 0, 0, 0.25);
  border-radius: 24px;
  margin: 8px 4px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    inset 0 2px 15px rgba(0, 0, 0, 0.2),
    0 4px 20px rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
}

.pile-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
  padding: 8px;
  border-radius: 12px;
  transition: transform 0.2s ease;
}

.pile-wrapper:hover {
  transform: translateY(-2px);
}

.pile-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px 10px;
  border-radius: 10px;
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

.burn-pile-hidden {
  visibility: hidden;
  pointer-events: none;
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

/* ==================== ACTION AREA WRAPPER ==================== */
.action-area-wrapper {
  min-height: 70px; /* Fixed height to prevent layout jumping */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

/* ==================== ACTION BUTTONS ==================== */
.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding: 12px;
  flex-shrink: 0;
}

.action-buttons ion-button {
  --border-radius: 16px;
  font-weight: bold;
  font-size: 15px;
  min-width: 130px;
  height: 46px;
  text-transform: none;
  letter-spacing: 0.5px;
}

.play-button {
  --background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
  --box-shadow: 0 4px 15px rgba(46, 125, 50, 0.5);
}

.play-button:active {
  --box-shadow: 0 2px 8px rgba(46, 125, 50, 0.5);
}

.pickup-button {
  --background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
  --box-shadow: 0 4px 15px rgba(255, 152, 0, 0.5);
}

.pickup-button:active {
  --box-shadow: 0 2px 8px rgba(255, 152, 0, 0.5);
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
  padding: 12px;
  color: white;
  font-size: 16px;
  position: absolute;
  inset: 0;
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
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 8px);
  flex-shrink: 0;
}

/* ==================== PASS PHONE OVERLAY ==================== */
.pass-phone-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  cursor: pointer;
}

.pass-phone-content {
  text-align: center;
  color: white;
  padding: 32px;
}

.pass-phone-icon {
  font-size: 80px;
  animation: phone-bounce 1s ease-in-out infinite;
}

@keyframes phone-bounce {
  0%, 100% {
    transform: translateY(0) rotate(-10deg);
  }
  50% {
    transform: translateY(-15px) rotate(10deg);
  }
}

.pass-phone-content h2 {
  font-size: 28px;
  margin: 16px 0 8px;
}

.next-player-name {
  font-size: 36px;
  font-weight: bold;
  color: var(--ion-color-primary);
  margin: 16px 0;
}

.tap-hint {
  font-size: 16px;
  opacity: 0.7;
  margin-top: 32px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.pass-phone-enter-active {
  animation: fade-in 0.3s ease-out;
}

.pass-phone-leave-active {
  animation: fade-out 0.3s ease-in;
}

@keyframes fade-out {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
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

/* ==================== LOADING PHASE ==================== */
.loading-phase {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-content {
  text-align: center;
  color: white;
}

.loading-icon {
  font-size: 64px;
  animation: loading-bounce 1s ease-in-out infinite;
}

@keyframes loading-bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-15px);
  }
}

.loading-content p {
  margin: 16px 0 0;
  font-size: 18px;
}

.debug-info {
  font-size: 12px !important;
  opacity: 0.6;
  font-family: monospace;
}

/* ==================== DEVIL EFFECT (666 Easter Egg) ==================== */
.devil-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, rgba(139, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.95) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  pointer-events: none;
}

.devil-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: devil-pulse 0.5s ease-in-out infinite alternate;
}

@keyframes devil-pulse {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }
  100% {
    transform: scale(1.05);
    filter: brightness(1.2);
  }
}

.devil-horns {
  display: flex;
  gap: 60px;
  margin-bottom: -10px;
}

.horn {
  width: 0;
  height: 0;
  border-left: 15px solid transparent;
  border-right: 15px solid transparent;
  border-bottom: 50px solid #8b0000;
  filter: drop-shadow(0 0 10px #ff0000);
  animation: horn-grow 0.5s ease-out forwards;
}

.horn.left {
  transform: rotate(-20deg);
}

.horn.right {
  transform: rotate(20deg);
}

@keyframes horn-grow {
  0% {
    border-bottom-width: 0;
    opacity: 0;
  }
  100% {
    border-bottom-width: 50px;
    opacity: 1;
  }
}

.devil-text {
  display: flex;
  gap: 10px;
  margin: 20px 0;
}

.devil-six {
  font-size: 80px;
  font-weight: bold;
  color: #ff0000;
  text-shadow:
    0 0 20px #ff0000,
    0 0 40px #ff0000,
    0 0 60px #8b0000;
  animation: six-flicker 0.1s ease-in-out infinite alternate;
}

.devil-six:nth-child(1) { animation-delay: 0s; }
.devil-six:nth-child(2) { animation-delay: 0.05s; }
.devil-six:nth-child(3) { animation-delay: 0.1s; }

@keyframes six-flicker {
  0% {
    opacity: 0.8;
    transform: scale(1);
  }
  100% {
    opacity: 1;
    transform: scale(1.02);
  }
}

.devil-emoji {
  font-size: 60px;
  animation: devil-bounce 0.3s ease-in-out infinite alternate;
}

@keyframes devil-bounce {
  0% {
    transform: translateY(0) rotate(-5deg);
  }
  100% {
    transform: translateY(-10px) rotate(5deg);
  }
}

/* Devil overlay transitions */
.devil-overlay-enter-active {
  animation: devil-enter 0.3s ease-out;
}

.devil-overlay-leave-active {
  animation: devil-leave 0.5s ease-in;
}

@keyframes devil-enter {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes devil-leave {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: scale(1.5);
    filter: blur(10px);
  }
}
</style>
