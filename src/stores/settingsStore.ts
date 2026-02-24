import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { AIDifficulty, AICharacter } from '@/types'
import { getRandomAICharacters } from '@/types'

export type CardNotation = 'nl' | 'en' | 'gzb'
export type CardBackStyle = 'classic' | 'modern' | 'royal' | 'minimal'

export const useSettingsStore = defineStore('settings', () => {
  // State
  const playerCount = ref(2)
  const humanPlayerCount = ref(1)
  const aiDifficulty = ref<AIDifficulty>('medium')
  const playerNames = ref<string[]>(['Speler 1'])
  const aiCharacters = ref<AICharacter[]>([])
  const soundEnabled = ref(true)
  const animationSpeed = ref<'slow' | 'normal' | 'fast'>('normal')
  const cardNotation = ref<CardNotation>('nl') // nl = B,V,H,A | en = J,Q,K,A | gzb = B,Z,G,A
  const cardBackStyle = ref<CardBackStyle>('classic')
  const leftHandedMode = ref(false)

  // Getters
  const aiPlayerCount = computed(() => playerCount.value - humanPlayerCount.value)

  const animationDuration = computed(() => {
    switch (animationSpeed.value) {
      case 'slow': return 600
      case 'normal': return 300
      case 'fast': return 150
      default: return 300
    }
  })

  // Actions
  function updateAICharacters() {
    const aiCount = Math.max(0, playerCount.value - humanPlayerCount.value)
    aiCharacters.value = getRandomAICharacters(aiCount, aiDifficulty.value)
    updatePlayerNamesWithAI()
  }

  function updatePlayerNamesWithAI() {
    const newNames: string[] = []
    let aiIndex = 0
    for (let i = 0; i < playerCount.value; i++) {
      if (i < humanPlayerCount.value) {
        // Human player - keep existing name or use default
        newNames.push(playerNames.value[i] || `Speler ${i + 1}`)
      } else {
        // AI player - use character name
        const character = aiCharacters.value[aiIndex++]
        newNames.push(character?.name || `Computer ${i}`)
      }
    }
    playerNames.value = newNames
  }

  function setPlayerCount(count: number) {
    playerCount.value = count

    // Ensure human player count doesn't exceed total
    if (humanPlayerCount.value > count) {
      humanPlayerCount.value = count
    }

    // Update AI characters and names
    updateAICharacters()
  }

  function setHumanPlayerCount(count: number) {
    humanPlayerCount.value = Math.min(count, playerCount.value)
    // Update AI characters and names
    updateAICharacters()
  }

  function shuffleAICharacters() {
    updateAICharacters()
  }

  function setAIDifficulty(difficulty: AIDifficulty) {
    aiDifficulty.value = difficulty
    // Update AI characters to match new difficulty
    updateAICharacters()
  }

  function setPlayerName(index: number, name: string) {
    if (index >= 0 && index < playerNames.value.length) {
      playerNames.value[index] = name
    }
  }

  function setSoundEnabled(enabled: boolean) {
    soundEnabled.value = enabled
  }

  function setAnimationSpeed(speed: 'slow' | 'normal' | 'fast') {
    animationSpeed.value = speed
  }

  function setCardBackStyle(style: CardBackStyle) {
    cardBackStyle.value = style
  }

  function setCardNotation(notation: CardNotation) {
    cardNotation.value = notation
  }

  function setLeftHandedMode(enabled: boolean) {
    leftHandedMode.value = enabled
  }

  function resetToDefaults() {
    playerCount.value = 2
    humanPlayerCount.value = 1
    aiDifficulty.value = 'medium'
    soundEnabled.value = true
    animationSpeed.value = 'normal'
    cardNotation.value = 'nl'
    cardBackStyle.value = 'classic'
    leftHandedMode.value = false
    // Reset AI characters and update names
    updateAICharacters()
  }

  // Initialize AI characters on store creation
  updateAICharacters()

  return {
    // State
    playerCount,
    humanPlayerCount,
    aiDifficulty,
    playerNames,
    aiCharacters,
    soundEnabled,
    animationSpeed,
    cardNotation,
    cardBackStyle,
    leftHandedMode,
    // Getters
    aiPlayerCount,
    animationDuration,
    // Actions
    setPlayerCount,
    setHumanPlayerCount,
    setAIDifficulty,
    setPlayerName,
    shuffleAICharacters,
    setSoundEnabled,
    setAnimationSpeed,
    setCardNotation,
    setCardBackStyle,
    setLeftHandedMode,
    resetToDefaults,
  }
})
