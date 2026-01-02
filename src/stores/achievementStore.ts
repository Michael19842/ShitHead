import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Preferences } from '@capacitor/preferences';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_IDS,
  type AchievementId,
  type Achievement
} from '@/types/achievements';

const STORAGE_KEY = 'shithead_achievements';
const STATS_KEY = 'shithead_stats';

export interface GameStats {
  totalWins: number;
  totalLosses: number;
  totalGames: number;
  totalBurns: number;
  currentWinStreak: number;
  currentLoseStreak: number;
  maxWinStreak: number;
  maxLoseStreak: number;
  onlineWins: number;
  maxPickupInGame: number;
}

const DEFAULT_STATS: GameStats = {
  totalWins: 0,
  totalLosses: 0,
  totalGames: 0,
  totalBurns: 0,
  currentWinStreak: 0,
  currentLoseStreak: 0,
  maxWinStreak: 0,
  maxLoseStreak: 0,
  onlineWins: 0,
  maxPickupInGame: 0
};

export const useAchievementStore = defineStore('achievements', () => {
  // State
  const unlockedAchievements = ref<Record<AchievementId, Date | null>>({} as Record<AchievementId, Date | null>);
  const stats = ref<GameStats>({ ...DEFAULT_STATS });
  const pendingUnlocks = ref<Achievement[]>([]);
  const isInitialized = ref(false);

  // Initialize all achievements as locked
  ACHIEVEMENT_IDS.forEach(id => {
    unlockedAchievements.value[id] = null;
  });

  // Getters
  const unlockedCount = computed(() => {
    return ACHIEVEMENT_IDS.filter(id => unlockedAchievements.value[id] !== null).length;
  });

  const totalCount = computed(() => ACHIEVEMENT_IDS.length);

  const unlockedList = computed(() => {
    return ACHIEVEMENT_IDS
      .filter(id => unlockedAchievements.value[id] !== null)
      .map(id => ({
        ...ACHIEVEMENTS[id],
        unlockedAt: unlockedAchievements.value[id]
      }))
      .sort((a, b) => {
        if (!a.unlockedAt || !b.unlockedAt) return 0;
        return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
      });
  });

  const lockedList = computed(() => {
    return ACHIEVEMENT_IDS
      .filter(id => unlockedAchievements.value[id] === null)
      .map(id => ACHIEVEMENTS[id]);
  });

  const allAchievements = computed(() => {
    return ACHIEVEMENT_IDS.map(id => ({
      ...ACHIEVEMENTS[id],
      unlocked: unlockedAchievements.value[id] !== null,
      unlockedAt: unlockedAchievements.value[id]
    }));
  });

  // Check if achievement is unlocked
  function isUnlocked(id: AchievementId): boolean {
    return unlockedAchievements.value[id] !== null;
  }

  // Unlock an achievement
  function unlock(id: AchievementId): boolean {
    if (unlockedAchievements.value[id] !== null) {
      return false; // Already unlocked
    }

    unlockedAchievements.value[id] = new Date();
    pendingUnlocks.value.push(ACHIEVEMENTS[id]);
    save();

    // Check for completionist achievement
    checkCompletionist();

    return true;
  }

  // Get next pending unlock (for showing animation)
  function popPendingUnlock(): Achievement | null {
    return pendingUnlocks.value.shift() || null;
  }

  // Check if all achievements are unlocked (except completionist)
  function checkCompletionist(): void {
    const otherAchievements = ACHIEVEMENT_IDS.filter(id => id !== 'completionist');
    const allUnlocked = otherAchievements.every(id => unlockedAchievements.value[id] !== null);

    if (allUnlocked && !isUnlocked('completionist')) {
      unlock('completionist');
    }
  }

  // Update stats and check for achievements
  function recordGameResult(result: {
    won: boolean;
    isOnline: boolean;
    burnsInGame: number;
    pickedUpTotal: number;
    didPickup: boolean;
    gameDurationMs: number;
    playedQuad: boolean;
    played2: boolean;
    played3: boolean;
    played7: boolean;
    burnedWith4OfKind: boolean;
    blindSuccess: boolean;
    wonWithBlind: boolean;
  }): void {
    // Update basic stats
    stats.value.totalGames++;
    stats.value.totalBurns += result.burnsInGame;

    if (result.won) {
      stats.value.totalWins++;
      stats.value.currentWinStreak++;
      stats.value.currentLoseStreak = 0;
      stats.value.maxWinStreak = Math.max(stats.value.maxWinStreak, stats.value.currentWinStreak);

      if (result.isOnline) {
        stats.value.onlineWins++;
      }
    } else {
      stats.value.totalLosses++;
      stats.value.currentLoseStreak++;
      stats.value.currentWinStreak = 0;
      stats.value.maxLoseStreak = Math.max(stats.value.maxLoseStreak, stats.value.currentLoseStreak);
    }

    stats.value.maxPickupInGame = Math.max(stats.value.maxPickupInGame, result.pickedUpTotal);

    // Check achievements
    checkAchievements(result);
    save();
  }

  function checkAchievements(result: {
    won: boolean;
    isOnline: boolean;
    burnsInGame: number;
    pickedUpTotal: number;
    didPickup: boolean;
    gameDurationMs: number;
    playedQuad: boolean;
    played2: boolean;
    played3: boolean;
    played7: boolean;
    burnedWith4OfKind: boolean;
    blindSuccess: boolean;
    wonWithBlind: boolean;
  }): void {
    // First win/loss
    if (result.won && stats.value.totalWins === 1) unlock('first_win');
    if (!result.won && stats.value.totalLosses === 1) unlock('first_loss');

    // Win milestones
    if (stats.value.totalWins >= 10) unlock('win_10');
    if (stats.value.totalWins >= 50) unlock('win_50');
    if (stats.value.totalWins >= 100) unlock('win_100');

    // Loss milestones
    if (stats.value.totalLosses >= 10) unlock('lose_10');

    // Streaks
    if (stats.value.currentWinStreak >= 5) unlock('win_streak_5');
    if (stats.value.currentWinStreak >= 10) unlock('win_streak_10');
    if (stats.value.currentLoseStreak >= 5) unlock('lose_streak_5');

    // Burns
    if (result.burnsInGame > 0 && stats.value.totalBurns >= 1) unlock('first_burn');
    if (stats.value.totalBurns >= 10) unlock('burn_10');
    if (stats.value.totalBurns >= 50) unlock('burn_50');
    if (result.burnedWith4OfKind) unlock('burn_4_of_kind');
    if (result.burnsInGame >= 5) unlock('burn_5_in_game');

    // Special cards
    if (result.played2) unlock('play_2');
    if (result.played3) unlock('play_3');
    if (result.played7) unlock('play_7');
    if (result.playedQuad) unlock('play_quad');

    // Pickups
    if (result.pickedUpTotal >= 20) unlock('pickup_20');
    if (result.won && !result.didPickup) unlock('no_pickup_win');

    // Blind cards
    if (result.blindSuccess) unlock('blind_success');
    if (result.wonWithBlind) unlock('blind_win');

    // Duration
    if (result.won && result.gameDurationMs < 2 * 60 * 1000) unlock('speed_win');
    if (result.won && result.gameDurationMs > 10 * 60 * 1000) unlock('marathon_win');

    // Online
    if (result.won && result.isOnline && stats.value.onlineWins === 1) unlock('online_first_win');

    // Total games
    if (stats.value.totalGames >= 100) unlock('play_100_games');
    if (stats.value.totalGames >= 500) unlock('play_500_games');

    // Comeback
    if (result.won && result.pickedUpTotal >= 15) unlock('comeback_win');

    // Flawless (first out, no pickups) - this needs to be tracked differently
    if (result.won && !result.didPickup) unlock('flawless_win');
  }

  // Record a single burn event (for mid-game tracking)
  function recordBurn(isFourOfKind: boolean): void {
    // This is called during the game for immediate unlock feedback
    if (isFourOfKind && !isUnlocked('burn_4_of_kind')) {
      unlock('burn_4_of_kind');
    }
  }

  // Persistence
  async function save(): Promise<void> {
    try {
      await Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(unlockedAchievements.value)
      });
      await Preferences.set({
        key: STATS_KEY,
        value: JSON.stringify(stats.value)
      });
    } catch (e) {
      console.error('Failed to save achievements:', e);
    }
  }

  async function load(): Promise<void> {
    try {
      const achievementsData = await Preferences.get({ key: STORAGE_KEY });
      if (achievementsData.value) {
        const loaded = JSON.parse(achievementsData.value);
        ACHIEVEMENT_IDS.forEach(id => {
          if (loaded[id]) {
            unlockedAchievements.value[id] = new Date(loaded[id]);
          }
        });
      }

      const statsData = await Preferences.get({ key: STATS_KEY });
      if (statsData.value) {
        stats.value = { ...DEFAULT_STATS, ...JSON.parse(statsData.value) };
      }

      isInitialized.value = true;
    } catch (e) {
      console.error('Failed to load achievements:', e);
      isInitialized.value = true;
    }
  }

  // Reset all achievements (for testing)
  async function reset(): Promise<void> {
    ACHIEVEMENT_IDS.forEach(id => {
      unlockedAchievements.value[id] = null;
    });
    stats.value = { ...DEFAULT_STATS };
    pendingUnlocks.value = [];
    await save();
  }

  return {
    // State
    unlockedAchievements,
    stats,
    pendingUnlocks,
    isInitialized,

    // Getters
    unlockedCount,
    totalCount,
    unlockedList,
    lockedList,
    allAchievements,

    // Actions
    isUnlocked,
    unlock,
    popPendingUnlock,
    recordGameResult,
    recordBurn,
    load,
    save,
    reset
  };
});
