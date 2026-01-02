import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AIDifficulty } from '@/types'

export type CardLanguage = 'nl' | 'en'
export type CardBackStyle = 'classic' | 'modern' | 'royal' | 'minimal'

export const useSettingsStore = defineStore('settings', () => {
  // State
  const playerCount = ref(2)
  const humanPlayerCount = ref(1)
  const aiDifficulty = ref<AIDifficulty>('medium')
  const playerNames = ref<string[]>(['Speler 1', 'Computer'])
  const soundEnabled = ref(true)
  const animationSpeed = ref<'slow' | 'normal' | 'fast'>('normal')
  const cardLanguage = ref<CardLanguage>('nl') // nl = B,V,H,A | en = J,Q,K,A
  const cardBackStyle = ref<CardBackStyle>('classic')

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
  function setPlayerCount(count: number) {
    playerCount.value = count

    // Build new names array with correct length
    const newNames: string[] = []
    for (let i = 0; i < count; i++) {
      if (i < playerNames.value.length) {
        newNames.push(playerNames.value[i])
      } else {
        // Default name for new players
        newNames.push(i === 0 ? 'Speler 1' : `Computer ${i}`)
      }
    }
    playerNames.value = newNames

    // Ensure human player count doesn't exceed total
    if (humanPlayerCount.value > count) {
      humanPlayerCount.value = count
    }
  }

  function setHumanPlayerCount(count: number) {
    humanPlayerCount.value = Math.min(count, playerCount.value)
  }

  function setAIDifficulty(difficulty: AIDifficulty) {
    aiDifficulty.value = difficulty
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

  function setCardLanguage(language: CardLanguage) {
    cardLanguage.value = language
  }

  function setCardBackStyle(style: CardBackStyle) {
    cardBackStyle.value = style
  }

  function resetToDefaults() {
    playerCount.value = 2
    humanPlayerCount.value = 1
    aiDifficulty.value = 'medium'
    playerNames.value = ['Speler 1', 'Computer']
    soundEnabled.value = true
    animationSpeed.value = 'normal'
    cardLanguage.value = 'nl'
    cardBackStyle.value = 'classic'
  }

  return {
    // State
    playerCount,
    humanPlayerCount,
    aiDifficulty,
    playerNames,
    soundEnabled,
    animationSpeed,
    cardLanguage,
    cardBackStyle,
    // Getters
    aiPlayerCount,
    animationDuration,
    // Actions
    setPlayerCount,
    setHumanPlayerCount,
    setAIDifficulty,
    setPlayerName,
    setSoundEnabled,
    setAnimationSpeed,
    setCardLanguage,
    setCardBackStyle,
    resetToDefaults,
  }
})
