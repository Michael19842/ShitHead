import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Card, Player, GamePhase, GameAction, PlayerPhase } from '@/types'
import { GamePhase as GP, PlayerPhase as PP } from '@/types'

export const useGameStore = defineStore('game', () => {
  // State
  const players = ref<Player[]>([])
  const currentPlayerIndex = ref(0)
  const deck = ref<Card[]>([])
  const discardPile = ref<Card[]>([])
  const burnPile = ref<Card[]>([])
  const phase = ref<GamePhase>(GP.SETUP)
  const deckCount = ref(1)
  const lastAction = ref<GameAction | null>(null)
  const selectedCards = ref<Card[]>([])
  const playDirection = ref<1 | -1>(1) // 1 = clockwise, -1 = counter-clockwise

  // Getters
  const currentPlayer = computed(() => players.value[currentPlayerIndex.value])

  const activePlayers = computed(() =>
    players.value.filter(p => !p.isOut)
  )

  const topCard = computed(() => {
    if (discardPile.value.length === 0) return null
    return discardPile.value[discardPile.value.length - 1]
  })

  const effectiveTopCard = computed(() => {
    // Look through 3s to find the effective card to beat
    for (let i = discardPile.value.length - 1; i >= 0; i--) {
      const card = discardPile.value[i]
      if (card.rank !== 3) {
        return card
      }
    }
    return null // All 3s or empty pile
  })

  const isSevenActive = computed(() => {
    // Check if a 7 was played and not covered by a reset card
    for (let i = discardPile.value.length - 1; i >= 0; i--) {
      const card = discardPile.value[i]
      if (card.rank === 7) return true
      if (card.rank === 2) return false // 2 resets
      if (card.rank !== 3) return false // Non-3 card breaks the chain
    }
    return false
  })

  const isGameOver = computed(() => phase.value === GP.ENDED)

  const loser = computed(() => {
    if (!isGameOver.value) return null
    return players.value.find(p => !p.isOut) || null
  })

  function getPlayerPhase(player: Player): PlayerPhase {
    if (player.hand.length > 0 || deck.value.length > 0) {
      return PP.HAND
    }
    if (player.faceUp.length > 0) {
      return PP.FACE_UP
    }
    return PP.FACE_DOWN
  }

  // Actions
  function initGame(gamePlayers: Player[], gameDeck: Card[], numDecks: number) {
    players.value = gamePlayers
    deck.value = gameDeck
    discardPile.value = []
    burnPile.value = []
    phase.value = GP.SWAPPING
    deckCount.value = numDecks
    currentPlayerIndex.value = 0
    lastAction.value = null
    selectedCards.value = []
    playDirection.value = 1 // Reset to clockwise
  }

  function startPlaying() {
    phase.value = GP.PLAYING
  }

  function setCurrentPlayer(index: number) {
    currentPlayerIndex.value = index
  }

  function nextPlayer() {
    const direction = playDirection.value
    let nextIndex = currentPlayerIndex.value
    const playerCount = players.value.length

    // Move in the current direction
    nextIndex = ((nextIndex + direction) % playerCount + playerCount) % playerCount

    // Skip players who are out
    while (players.value[nextIndex].isOut) {
      nextIndex = ((nextIndex + direction) % playerCount + playerCount) % playerCount
      // Safety check to prevent infinite loop
      if (nextIndex === currentPlayerIndex.value) break
    }
    currentPlayerIndex.value = nextIndex
  }

  function reverseDirection() {
    playDirection.value = playDirection.value === 1 ? -1 : 1
  }

  function addToDiscard(cards: Card[]) {
    discardPile.value.push(...cards)
  }

  function clearDiscard() {
    const burned = [...discardPile.value]
    burnPile.value.push(...burned)
    discardPile.value = []
    return burned
  }

  function pickupDiscard(player: Player) {
    const pickedUp = [...discardPile.value]
    player.hand.push(...pickedUp)
    discardPile.value = []
    return pickedUp
  }

  function drawCards(player: Player, count: number): Card[] {
    const drawn: Card[] = []
    for (let i = 0; i < count && deck.value.length > 0; i++) {
      const card = deck.value.pop()
      if (card) {
        drawn.push(card)
        player.hand.push(card)
      }
    }
    return drawn
  }

  function removeCardsFromPlayer(player: Player, cards: Card[]) {
    const cardIds = new Set(cards.map(c => c.id))
    player.hand = player.hand.filter(c => !cardIds.has(c.id))
    player.faceUp = player.faceUp.filter(c => !cardIds.has(c.id))
    player.faceDown = player.faceDown.filter(c => !cardIds.has(c.id))
  }

  function setPlayerOut(playerId: string) {
    const player = players.value.find(p => p.id === playerId)
    if (player) {
      player.isOut = true
    }
    // Check if game is over (only one player left)
    if (activePlayers.value.length <= 1) {
      phase.value = GP.ENDED
    }
  }

  function setLastAction(action: GameAction) {
    lastAction.value = action
  }

  function selectCard(card: Card) {
    const index = selectedCards.value.findIndex(c => c.id === card.id)
    if (index === -1) {
      // Only allow selecting cards of the same rank
      if (selectedCards.value.length === 0 || selectedCards.value[0].rank === card.rank) {
        selectedCards.value.push(card)
      } else {
        // Different rank - replace entire selection with new card
        selectedCards.value = [card]
      }
    } else {
      selectedCards.value.splice(index, 1)
    }
  }

  function clearSelection() {
    selectedCards.value = []
  }

  function swapCards(player: Player, handCard: Card, faceUpCard: Card) {
    const handIndex = player.hand.findIndex(c => c.id === handCard.id)
    const faceUpIndex = player.faceUp.findIndex(c => c.id === faceUpCard.id)

    if (handIndex !== -1 && faceUpIndex !== -1) {
      player.hand[handIndex] = faceUpCard
      player.faceUp[faceUpIndex] = handCard
    }
  }

  function resetGame() {
    players.value = []
    currentPlayerIndex.value = 0
    deck.value = []
    discardPile.value = []
    burnPile.value = []
    phase.value = GP.SETUP
    deckCount.value = 1
    lastAction.value = null
    selectedCards.value = []
    playDirection.value = 1 // Reset to clockwise
  }

  return {
    // State
    players,
    currentPlayerIndex,
    deck,
    discardPile,
    burnPile,
    phase,
    deckCount,
    lastAction,
    selectedCards,
    playDirection,
    // Getters
    currentPlayer,
    activePlayers,
    topCard,
    effectiveTopCard,
    isSevenActive,
    isGameOver,
    loser,
    getPlayerPhase,
    // Actions
    initGame,
    startPlaying,
    setCurrentPlayer,
    nextPlayer,
    reverseDirection,
    addToDiscard,
    clearDiscard,
    pickupDiscard,
    drawCards,
    removeCardsFromPlayer,
    setPlayerOut,
    setLastAction,
    selectCard,
    clearSelection,
    swapCards,
    resetGame,
  }
})
