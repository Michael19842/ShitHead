import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AIDifficulty } from '@/types'

export const useSettingsStore = defineStore('settings', () => {
  // State
  const playerCount = ref(2)
  const humanPlayerCount = ref(1)
  const aiDifficulty = ref<AIDifficulty>('medium')
  const playerNames = ref<string[]>(['Speler 1', 'Computer'])
  const soundEnabled = ref(true)
  const animationSpeed = ref<'slow' | 'normal' | 'fast'>('normal')

  // Getters
  const aiPlayerCount = computed(() => playerCount.value - humanPlayerCount.value)

  const animationDuration = computed(() => {
    switch (animationSpeed.value) {
      case 'slow': return 600
      case 'normal': return 300
      case 'fast': return 150
    }
  })

  // Actions
  function setPlayerCount(count: number) {
    playerCount.value = count
    // Ensure we have enough player names
    while (playerNames.value.length < count) {
      const index = playerNames.value.length + 1
      playerNames.value.push(`Speler ${index}`)
    }
    // Trim excess names
    playerNames.value = playerNames.value.slice(0, count)
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

  function resetToDefaults() {
    playerCount.value = 2
    humanPlayerCount.value = 1
    aiDifficulty.value = 'medium'
    playerNames.value = ['Speler 1', 'Computer']
    soundEnabled.value = true
    animationSpeed.value = 'normal'
  }

  return {
    // State
    playerCount,
    humanPlayerCount,
    aiDifficulty,
    playerNames,
    soundEnabled,
    animationSpeed,
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
    resetToDefaults,
  }
})
