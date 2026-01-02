<template>
  <ion-page>
    <AchievementUnlock />
    <ConnectionStatus />
    <EmojiReactionDisplay
      :reactions="mpStore.reactions"
      :player-names="mpStore.playerNames"
    />
    <ion-header>
      <ion-toolbar class="game-toolbar">
        <ion-title>
          <span class="header-logo">💩</span>
          Online
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="confirmLeave">
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

        <!-- Loading state -->
        <div v-if="isLoading" class="loading-state">
          <ion-spinner name="crescent" />
          <p>Spel laden...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="mpStore.error && !mpStore.currentGame" class="error-state">
          <div class="error-icon">😕</div>
          <p>{{ mpStore.error }}</p>
          <ion-button @click="router.replace('/online')">Terug naar menu</ion-button>
        </div>

        <!-- Swap phase -->
        <div v-else-if="mpStore.isSwapping" class="swap-phase">
          <div class="swap-header">
            <h2>Ruil je kaarten</h2>
            <p>Tap op een handkaart en dan op een open kaart om te ruilen</p>
            <TurnTimer :expires-at="mpStore.swapExpiresAt" label="Tijd over" />
          </div>

          <div class="swap-area">
            <div class="swap-section">
              <h4>Je hand</h4>
              <CardHand
                :cards="myHand"
                :selected-cards="swapHandCard ? [swapHandCard] : []"
                :sorted="true"
                @select="selectSwapHand"
              />
            </div>

            <div class="swap-section">
              <h4>Open kaarten</h4>
              <div class="face-up-row">
                <PlayingCard
                  v-for="card in myFaceUp"
                  :key="card.id"
                  :card="card"
                  :selected="swapFaceUpCard?.id === card.id"
                  @click="selectSwapFaceUp(card)"
                />
              </div>
            </div>
          </div>

          <ion-button
            expand="block"
            :disabled="mpStore.mySwapConfirmed"
            @click="confirmSwap"
            class="confirm-button"
          >
            {{ mpStore.mySwapConfirmed ? 'Wachten op anderen...' : 'Klaar met ruilen' }}
          </ion-button>
        </div>

        <!-- Playing phase -->
        <div v-else-if="mpStore.isPlaying" class="play-area">
          <!-- Opponents -->
          <div class="opponents-section">
            <div
              v-for="player in mpStore.opponents"
              :key="player.id"
              class="opponent-wrapper"
            >
              <PlayerArea
                :player="getLocalPlayer(player.id)"
                :is-current-player="player.isCurrent"
                :is-opponent="true"
                :selected-cards="[]"
                :discard-pile="mpStore.discardPile"
                :deck-empty="true"
              />
              <div v-if="player.connectionStatus === 'disconnected'" class="disconnected-badge">
                Offline
              </div>
            </div>
          </div>

          <!-- Turn timer -->
          <div class="turn-info">
            <TurnTimer
              v-if="mpStore.isMyTurn"
              :expires-at="mpStore.turnExpiresAt"
              label="Jouw beurt"
              :warning="true"
            />
            <div v-else class="waiting-turn">
              <span>{{ currentPlayerName }} is aan de beurt</span>
            </div>
          </div>

          <!-- Center area -->
          <div class="center-area">
            <!-- Draw pile / Deck -->
            <div class="pile-wrapper deck-pile">
              <span class="pile-label">Deck</span>
              <CardPile
                :cards="mpStore.deck"
                :face-down="true"
                :show-count="true"
                empty-text="Leeg"
              />
            </div>

            <!-- Discard pile -->
            <div class="pile-wrapper discard-pile" :class="{ 'can-pickup': mpStore.canPickup && mpStore.isMyTurn }">
              <span class="pile-label">Aflegstapel</span>
              <CardPile
                :cards="mpStore.discardPile"
                :face-down="false"
                :show-count="true"
                :show-effects="true"
                empty-text="Leg kaart"
              />
              <Transition name="indicator">
                <div v-if="mpStore.isSevenActive" class="seven-indicator">
                  <span class="indicator-icon">7️⃣</span> of lager!
                </div>
              </Transition>
            </div>

            <!-- Burn pile -->
            <div class="pile-wrapper burn-pile" :class="{ 'burn-pile-hidden': mpStore.burnPile.length === 0 }">
              <span class="pile-label">Verbrand</span>
              <CardPile
                :cards="mpStore.burnPile"
                :face-down="true"
                :show-count="true"
                empty-text=""
              />
              <div class="burn-glow" v-if="mpStore.burnPile.length > 0"></div>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="action-area-wrapper">
            <div class="action-buttons" v-if="mpStore.isMyTurn">
              <ion-button
                :disabled="!mpStore.canPlaySelected"
                @click="playSelected"
                color="success"
                class="play-button"
              >
                <ion-icon :icon="checkmarkCircle" slot="start"></ion-icon>
                Speel {{ mpStore.selectedCards.length > 0 ? `(${mpStore.selectedCards.length})` : '' }}
              </ion-button>
              <ion-button
                :disabled="!mpStore.canPickup"
                @click="pickupPile"
                color="warning"
                class="pickup-button"
              >
                <ion-icon :icon="handLeft" slot="start"></ion-icon>
                Pak stapel
              </ion-button>
            </div>
          </div>

          <!-- My player area with emoji picker -->
          <div class="my-player-section" v-if="mpStore.myPlayer">
            <!-- Emoji picker button -->
            <button class="emoji-picker-button" @click="showEmojiPicker = !showEmojiPicker">
              😀
            </button>

            <!-- Emoji picker popup -->
            <Transition name="emoji-popup">
              <div v-if="showEmojiPicker" class="emoji-picker-popup">
                <button
                  v-for="emoji in EMOJI_REACTIONS"
                  :key="emoji"
                  class="emoji-option"
                  :class="{ 'on-cooldown': reactionCooldown }"
                  :disabled="reactionCooldown"
                  @click="sendReactionAndClose(emoji)"
                >
                  {{ emoji }}
                </button>
              </div>
            </Transition>

            <PlayerArea
              :player="getLocalPlayer(mpStore.myPlayerId)"
              :is-current-player="mpStore.isMyTurn"
              :is-opponent="false"
              :selected-cards="mpStore.selectedCards"
              :discard-pile="mpStore.discardPile"
              :deck-empty="true"
              :player-phase="mpStore.myPlayerPhase"
              @select-card="selectCard"
              @play-face-down="playFaceDown"
            />
          </div>
        </div>

        <!-- Game ended -->
        <div v-else-if="mpStore.isEnded" class="game-ended">
          <div class="end-content">
            <div class="trophy">💩</div>
            <h2>Spel Afgelopen!</h2>
            <p v-if="mpStore.loser" class="loser-text">
              <span class="loser-name">{{ mpStore.loser.name }}</span>
              <span class="loser-title">is de Shithead!</span>
            </p>
            <ion-button @click="goToResults" expand="block">
              Bekijk Resultaten
            </ion-button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonSpinner,
  alertController
} from '@ionic/vue';
import { closeOutline, checkmarkCircle, handLeft } from 'ionicons/icons';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTimer } from '@/composables/useTimer';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAchievementStore } from '@/stores/achievementStore';
import { soundService } from '@/services/soundService';
import type { Card, Player, EmojiReaction } from '@/types';
import { EMOJI_REACTIONS } from '@/types';
import PlayerArea from '@/components/game/PlayerArea.vue';
import CardPile from '@/components/game/CardPile.vue';
import CardHand from '@/components/game/CardHand.vue';
import PlayingCard from '@/components/game/PlayingCard.vue';
import TurnTimer from '@/components/online/TurnTimer.vue';
import ConnectionStatus from '@/components/online/ConnectionStatus.vue';
import EmojiReactionDisplay from '@/components/online/EmojiReactionDisplay.vue';
import AchievementUnlock from '@/components/AchievementUnlock.vue';

const router = useRouter();
const route = useRoute();
const mpStore = useMultiplayerStore();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const achievementStore = useAchievementStore();

const isLoading = ref(true);

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
const swapHandCard = ref<Card | null>(null);
const swapFaceUpCard = ref<Card | null>(null);
const isHandlingTimeout = ref(false);
const reactionCooldown = ref(false);
const showEmojiPicker = ref(false);
const showBurnAnimation = ref(false);
const gameMessage = ref<string | null>(null);
const gameMessageClass = ref('');
const messageIcon = ref<string | null>(null);

const myHand = computed(() => mpStore.myPlayer?.hand || []);
const myFaceUp = computed(() => mpStore.myPlayer?.faceUp || []);

// Timer for auto-pickup on timeout
const turnTimer = useTimer({
  onExpire: async () => {
    if (mpStore.isMyTurn && mpStore.isPlaying && !isHandlingTimeout.value) {
      isHandlingTimeout.value = true;
      try {
        const result = await mpStore.onTurnTimeout();
        if (result.banned) {
          router.replace('/online');
        }
      } finally {
        isHandlingTimeout.value = false;
      }
    }
  }
});

// Watch for turn changes to update timer
watch(() => mpStore.turnExpiresAt, (newExpiry) => {
  if (mpStore.isMyTurn && newExpiry) {
    turnTimer.setExpiry(newExpiry);
  } else {
    turnTimer.setExpiry(null);
  }
}, { immediate: true });

// Watch for turn changes to play sound
watch(() => mpStore.isMyTurn, (isMyTurn, wasMyTurn) => {
  if (isMyTurn && !wasMyTurn && mpStore.isPlaying) {
    soundService.play('your-turn');
  }
});

// Watch for game end to play sound and record achievements
watch(() => mpStore.isEnded, (isEnded) => {
  if (isEnded) {
    // If there's no loser (winner by forfeit) or I'm not the loser, I win
    const iWon = !mpStore.loser || mpStore.loser.id !== mpStore.myPlayerId;
    soundService.play(iWon ? 'game-win' : 'game-lose');

    // Check if won with a blind card (face down) - player must have played all cards including blind
    if (iWon && blindSuccess.value) {
      wonWithBlind.value = true;
    }

    // Record game result for achievements
    achievementStore.recordGameResult({
      won: iWon,
      isOnline: true,
      burnsInGame: burnsThisGame.value,
      pickedUpTotal: pickedUpThisGame.value,
      didPickup: didPickupThisGame.value,
      gameDurationMs: Date.now() - gameStartTime.value,
      playedQuad: playedQuad.value,
      played2: played2.value,
      played3: played3.value,
      played7: played7.value,
      burnedWith4OfKind: burnedWith4OfKind.value,
      blindSuccess: blindSuccess.value,
      wonWithBlind: wonWithBlind.value,
    });
  }
});

// Track previous burn pile length to detect burns from other players
let previousBurnPileLength = 0;

// Watch for burns from ANY player (including opponents)
watch(() => mpStore.burnPile.length, (newLength, oldLength) => {
  // Only trigger if burn pile grew and we're not currently animating
  if (newLength > (oldLength ?? 0) && !showBurnAnimation.value && mpStore.isPlaying) {
    // Trigger burn animation for ALL burns (including from other players)
    triggerBurnAnimation();
  }
});

// Watch for special card plays from other players on discard pile
watch(() => mpStore.discardPile, (newPile, oldPile) => {
  if (!mpStore.isPlaying || !newPile || newPile.length === 0) return;

  const oldLength = oldPile?.length ?? 0;

  // Only react to new cards being played (not pickups)
  if (newPile.length > oldLength) {
    const topCard = newPile[newPile.length - 1];

    // If it's not my turn, it means another player played
    if (!mpStore.isMyTurn) {
      // Play sound for special cards from other players
      soundService.playSpecialCard(topCard.rank);
    }
  }
}, { deep: true });

const currentPlayerName = computed(() => {
  if (!mpStore.currentGame || !mpStore.currentPlayerId) return '';
  return mpStore.currentGame.players[mpStore.currentPlayerId]?.displayName || '';
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

async function triggerBurnAnimation() {
  soundService.play('special-burn');
  showBurnAnimation.value = true;
  await new Promise(resolve => setTimeout(resolve, 2000));
  showBurnAnimation.value = false;
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

let disconnectCheckInterval: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  await authStore.initialize();

  if (!authStore.isRegistered) {
    router.replace('/online/register');
    return;
  }

  const gameId = route.params.gameId as string;
  const success = await mpStore.joinGame(gameId);

  if (!success) {
    // Error is shown in template
  }

  isLoading.value = false;

  // Initialize sound service
  soundService.setEnabled(settingsStore.soundEnabled);
  soundService.init();

  // Initialize achievements
  if (!achievementStore.isInitialized) {
    await achievementStore.load();
  }

  // Reset achievement tracking for this game
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

  // Check for disconnected players every 15 seconds
  disconnectCheckInterval = setInterval(async () => {
    if (mpStore.isPlaying) {
      const result = await mpStore.checkDisconnectedPlayers();
      if (result.removed.length > 0) {
        console.log('Removed disconnected players:', result.removed);
      }
    }
  }, 15000);
});

onUnmounted(() => {
  if (disconnectCheckInterval) {
    clearInterval(disconnectCheckInterval);
    disconnectCheckInterval = null;
  }
  mpStore.leaveGame();
});

function getLocalPlayer(playerId: string | null): Player {
  if (!playerId || !mpStore.currentGame) {
    return { id: '', name: '', hand: [], faceUp: [], faceDown: [], isAI: false, isOut: false };
  }

  const p = mpStore.currentGame.players[playerId];
  const isMe = playerId === mpStore.myPlayerId;

  return {
    id: playerId,
    name: p.displayName,
    hand: isMe ? p.hand : [],
    faceUp: p.faceUp,
    faceDown: p.faceDown,
    isAI: false,
    isOut: p.isOut
  };
}

// Swap phase
function selectSwapHand(card: Card) {
  swapHandCard.value = swapHandCard.value?.id === card.id ? null : card;
  trySwap();
}

function selectSwapFaceUp(card: Card) {
  swapFaceUpCard.value = swapFaceUpCard.value?.id === card.id ? null : card;
  trySwap();
}

async function trySwap() {
  if (swapHandCard.value && swapFaceUpCard.value) {
    await mpStore.swapCards(swapHandCard.value, swapFaceUpCard.value);
    swapHandCard.value = null;
    swapFaceUpCard.value = null;
  }
}

async function confirmSwap() {
  await mpStore.confirmSwapPhase();
}

// Playing phase
function selectCard(card: Card) {
  if (!mpStore.isMyTurn) return;
  mpStore.selectCard(card);
}

async function playSelected() {
  const cards = [...mpStore.selectedCards];
  const result = await mpStore.playSelectedCards();

  if (result.success && cards.length > 0) {
    // Play sound for the card(s) played
    soundService.playSpecialCard(cards[0].rank);

    // Track special cards for achievements
    const rank = cards[0].rank;
    if (rank === 2) played2.value = true;
    if (rank === 3) played3.value = true;
    if (rank === 7) played7.value = true;
    if (cards.length >= 4) playedQuad.value = true;

    // Track burn for achievements (animation is handled by watcher)
    if (result.burned) {
      burnsThisGame.value++;

      // Check if burned with 4 of a kind (not a 10)
      if (rank !== 10 && cards.length >= 4) {
        burnedWith4OfKind.value = true;
      }
    }
  }
}

async function pickupPile() {
  const pileSize = mpStore.discardPile.length;
  const success = await mpStore.pickup();
  if (success) {
    soundService.play('pile-pickup');
    showMessage(`${pileSize} kaarten gepakt`, 'warning', '✋');
    // Track for achievements
    didPickupThisGame.value = true;
    pickedUpThisGame.value += pileSize;
  }
}

async function playFaceDown(index: number) {
  const pileSize = mpStore.discardPile.length;
  const result = await mpStore.playBlind(index);

  if (result.success && result.card) {
    soundService.playSpecialCard(result.card.rank);
    showMessage(`Blinde kaart: ${result.card.rank}`, 'info', '🎴');

    if (result.mustPickup) {
      setTimeout(() => {
        soundService.play('pile-pickup');
        showMessage('Niet speelbaar - Stapel gepakt!', 'warning', '😅');
      }, 500);
      // Track pickup for achievements
      didPickupThisGame.value = true;
      pickedUpThisGame.value += pileSize + 1; // pile + the blind card
    } else {
      // Blind card worked - track for achievements
      blindSuccess.value = true;
    }
    // Track burn for achievements (animation is handled by watcher)
    if (result.burned) {
      burnsThisGame.value++;
    }
  }
}

function sendReaction(emoji: EmojiReaction) {
  if (reactionCooldown.value) return;

  mpStore.react(emoji);
  reactionCooldown.value = true;

  setTimeout(() => {
    reactionCooldown.value = false;
  }, 2000);
}

function sendReactionAndClose(emoji: EmojiReaction) {
  sendReaction(emoji);
  showEmojiPicker.value = false;
}

function goToResults() {
  router.replace(`/online/game-over/${mpStore.gameId}`);
}

async function confirmLeave() {
  const alert = await alertController.create({
    header: 'Spel verlaten?',
    message: 'Weet je zeker dat je het spel wilt verlaten? Je kunt later terugkomen.',
    buttons: [
      { text: 'Annuleren', role: 'cancel' },
      {
        text: 'Verlaten',
        role: 'destructive',
        handler: () => {
          mpStore.leaveGame();
          router.replace('/online');
        }
      }
    ]
  });
  await alert.present();
}
</script>

<style scoped>
.game-toolbar {
  --background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
  --color: white;
}

.header-logo {
  font-size: 1.2rem;
  margin-right: 0.3rem;
}

.game-content {
  --background: #5D4E37;
}

.game-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px;
  background:
    radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(0,0,0,0.15) 100%),
    linear-gradient(160deg, #7D6B5A 0%, #5D4E37 30%, #4A3D2A 70%, #3D3222 100%);
}

/* Loading & Error */
.loading-state,
.error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: white;
}

.error-icon {
  font-size: 64px;
}

/* Swap phase */
.swap-phase {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 1rem;
}

.swap-header {
  text-align: center;
  color: white;
}

.swap-header h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.swap-header p {
  margin: 0;
  opacity: 0.8;
  font-size: 0.9rem;
}

.swap-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.swap-section {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  padding: 1rem;
}

.swap-section h4 {
  color: white;
  margin: 0 0 0.75rem 0;
  text-align: center;
}

.face-up-row {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.confirm-button {
  --border-radius: 12px;
  font-weight: bold;
  height: 50px;
}

/* Playing phase */
.play-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

.opponents-section {
  display: flex;
  gap: 6px;
  justify-content: center;
  padding: 4px;
  min-height: 80px;
  flex-shrink: 0;
}

.opponent-wrapper {
  position: relative;
  flex: 0 0 auto;
  max-width: 140px;
}

.disconnected-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(244, 67, 54, 0.9);
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.turn-info {
  display: flex;
  justify-content: center;
  padding: 4px;
  flex-shrink: 0;
}

.waiting-turn {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
}

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

.action-area-wrapper {
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 4px;
}

.action-buttons ion-button {
  --border-radius: 10px;
  font-weight: bold;
  min-width: 100px;
  height: 40px;
  font-size: 14px;
}

.play-button {
  --background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
}

.pickup-button {
  --background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
}

.my-player-section {
  flex-shrink: 0;
  padding-bottom: env(safe-area-inset-bottom, 4px);
  position: relative;
}

/* Emoji picker button - top right of player section */
.emoji-picker-button {
  position: absolute;
  top: 4px;
  right: 8px;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  font-size: 22px;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.emoji-picker-button:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.1);
}

.emoji-picker-button:active {
  transform: scale(0.95);
}

/* Emoji picker popup */
.emoji-picker-popup {
  position: absolute;
  top: 48px;
  right: 8px;
  background: rgba(30, 30, 40, 0.95);
  border-radius: 16px;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.emoji-option {
  width: 44px;
  height: 44px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  font-size: 24px;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-option:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.15);
}

.emoji-option:active {
  transform: scale(0.95);
}

.emoji-option.on-cooldown {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

/* Emoji popup transition */
.emoji-popup-enter-active {
  animation: emoji-popup-in 0.2s ease-out;
}

.emoji-popup-leave-active {
  animation: emoji-popup-out 0.15s ease-in;
}

@keyframes emoji-popup-in {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes emoji-popup-out {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.8) translateY(-10px);
  }
}

/* Game ended */
.game-ended {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.end-content {
  text-align: center;
  color: white;
  padding: 2rem;
}

.trophy {
  font-size: 80px;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

.end-content h2 {
  font-size: 2rem;
  margin: 1rem 0;
}

.loser-text {
  margin: 1rem 0 2rem;
}

.loser-name {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
  color: #ff6b6b;
}

.loser-title {
  font-size: 1.1rem;
  opacity: 0.9;
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
  0% { transform: translateX(-50%) scaleY(1) scaleX(1); }
  100% { transform: translateX(-50%) scaleY(1.1) scaleX(0.9); }
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
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-10px) scale(1.1); }
}

@keyframes burn-text-glow {
  0% {
    text-shadow: 0 0 20px #ff6600, 0 0 40px #ff3300, 0 0 60px #ff0000;
  }
  100% {
    text-shadow: 0 0 30px #ff9900, 0 0 60px #ff6600, 0 0 90px #ff3300, 0 0 120px #ff0000;
  }
}

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
  0% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-300px) scale(0); opacity: 0; }
}

.burn-overlay-enter-active { animation: burn-in 0.3s ease-out; }
.burn-overlay-leave-active { animation: burn-out 0.5s ease-in; }

@keyframes burn-in {
  0% { opacity: 0; transform: scale(0.5); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes burn-out {
  0% { opacity: 1; }
  100% { opacity: 0; }
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
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5) translateY(20px); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1) translateY(0); }
}

@keyframes message-out {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8) translateY(-20px); }
}
</style>
