/**
 * Achievement definitions for Shithead card game
 * 30 achievements with a humorous twist
 */

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  description: string;
  secret?: boolean; // Hidden until unlocked
}

export interface AchievementState {
  unlockedAt: Date | null;
}

export type AchievementId =
  | 'first_win'
  | 'first_loss'
  | 'win_10'
  | 'win_50'
  | 'win_100'
  | 'lose_10'
  | 'lose_streak_5'
  | 'win_streak_5'
  | 'win_streak_10'
  | 'first_burn'
  | 'burn_10'
  | 'burn_50'
  | 'burn_4_of_kind'
  | 'burn_5_in_game'
  | 'play_2'
  | 'play_3'
  | 'play_7'
  | 'play_quad'
  | 'play_666'
  | 'pickup_20'
  | 'no_pickup_win'
  | 'blind_success'
  | 'blind_win'
  | 'speed_win'
  | 'marathon_win'
  | 'online_first_win'
  | 'play_100_games'
  | 'play_500_games'
  | 'comeback_win'
  | 'flawless_win'
  | 'completionist';

export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  // First milestones
  first_win: {
    id: 'first_win',
    emoji: '👑',
    name: 'Niet de Shithead',
    description: 'Ontsnap voor het eerst aan de shithead titel'
  },
  first_loss: {
    id: 'first_loss',
    emoji: '💩',
    name: 'Shithead',
    description: 'Word voor het eerst de shithead (welkom bij de club)'
  },

  // Survival streaks
  win_10: {
    id: 'win_10',
    emoji: '🏅',
    name: 'Overlever',
    description: 'Ontsnap 10 keer aan de shithead titel'
  },
  win_50: {
    id: 'win_50',
    emoji: '🏆',
    name: 'Ontsnappingskunstenaar',
    description: 'Ontsnap 50 keer aan de shithead titel'
  },
  win_100: {
    id: 'win_100',
    emoji: '👸',
    name: 'Ongrijpbaar',
    description: 'Ontsnap 100 keer - je bent officieel te goed'
  },

  // Losing
  lose_10: {
    id: 'lose_10',
    emoji: '🚽',
    name: 'Vaste Klant',
    description: 'Word 10 keer de shithead'
  },
  lose_streak_5: {
    id: 'lose_streak_5',
    emoji: '📉',
    name: 'Vrije Val',
    description: 'Word 5 keer op rij de shithead'
  },

  // Survival streaks
  win_streak_5: {
    id: 'win_streak_5',
    emoji: '🔥',
    name: 'On Fire',
    description: 'Ontsnap 5 keer op rij'
  },
  win_streak_10: {
    id: 'win_streak_10',
    emoji: '☄️',
    name: 'Onstopbaar',
    description: 'Ontsnap 10 keer op rij'
  },

  // Burning
  first_burn: {
    id: 'first_burn',
    emoji: '🕯️',
    name: 'Vuurtje',
    description: 'Burn je eerste stapel'
  },
  burn_10: {
    id: 'burn_10',
    emoji: '🔥',
    name: 'Pyromaan',
    description: 'Burn 10 stapels'
  },
  burn_50: {
    id: 'burn_50',
    emoji: '🌋',
    name: 'Brandstichter',
    description: 'Burn 50 stapels'
  },
  burn_4_of_kind: {
    id: 'burn_4_of_kind',
    emoji: '💥',
    name: 'Vier Dezansen',
    description: 'Burn met 4 dezelfde kaarten'
  },
  burn_5_in_game: {
    id: 'burn_5_in_game',
    emoji: '🎆',
    name: 'Vuurwerk',
    description: 'Burn 5 stapels in één potje'
  },

  // Special cards
  play_2: {
    id: 'play_2',
    emoji: '2️⃣',
    name: 'Reset',
    description: 'Speel je eerste 2 (reset kaart)'
  },
  play_3: {
    id: 'play_3',
    emoji: '🪞',
    name: 'Spiegelbeeld',
    description: 'Speel je eerste 3 (glas kaart)'
  },
  play_7: {
    id: 'play_7',
    emoji: '7️⃣',
    name: 'Zevende Hemel',
    description: 'Speel je eerste 7 (cap kaart)'
  },
  play_quad: {
    id: 'play_quad',
    emoji: '🎰',
    name: 'Jackpot',
    description: 'Speel 4 kaarten tegelijk'
  },
  play_666: {
    id: 'play_666',
    emoji: '😈',
    name: 'Duivelse Hand',
    description: 'Speel drie zessen (666)',
    secret: true
  },

  // Pickups
  pickup_20: {
    id: 'pickup_20',
    emoji: '🎒',
    name: 'Verzamelaar',
    description: 'Pak 20+ kaarten op in één keer'
  },
  no_pickup_win: {
    id: 'no_pickup_win',
    emoji: '🧊',
    name: 'IJskoud',
    description: 'Ontsnap zonder ooit de stapel op te pakken'
  },

  // Blind cards
  blind_success: {
    id: 'blind_success',
    emoji: '🎲',
    name: 'Blind Geluk',
    description: 'Speel succesvol een blinde kaart'
  },
  blind_win: {
    id: 'blind_win',
    emoji: '🎪',
    name: 'Circusact',
    description: 'Ontsnap door een blinde kaart te spelen'
  },

  // Game duration
  speed_win: {
    id: 'speed_win',
    emoji: '⚡',
    name: 'Bliksemschicht',
    description: 'Ontsnap in minder dan 2 minuten'
  },
  marathon_win: {
    id: 'marathon_win',
    emoji: '🐢',
    name: 'Marathonloper',
    description: 'Ontsnap na een potje van meer dan 10 minuten'
  },

  // Online
  online_first_win: {
    id: 'online_first_win',
    emoji: '🌐',
    name: 'Wereldspeler',
    description: 'Ontsnap voor het eerst in een online potje'
  },

  // Total games
  play_100_games: {
    id: 'play_100_games',
    emoji: '🃏',
    name: 'Kaartenfanaat',
    description: 'Speel 100 potjes'
  },
  play_500_games: {
    id: 'play_500_games',
    emoji: '🎴',
    name: 'Verslaafd',
    description: 'Speel 500 potjes - misschien tijd voor een pauze?'
  },

  // Special escapes
  comeback_win: {
    id: 'comeback_win',
    emoji: '🦅',
    name: 'Comeback Kid',
    description: 'Ontsnap nadat je 15+ kaarten hebt opgepakt'
  },
  flawless_win: {
    id: 'flawless_win',
    emoji: '💎',
    name: 'Diamant',
    description: 'Ontsnap als eerste, zonder ooit op te pakken',
    secret: true
  },

  // Meta
  completionist: {
    id: 'completionist',
    emoji: '🎓',
    name: 'Afgestudeerd',
    description: 'Behaal alle andere achievements',
    secret: true
  }
};

export const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENTS) as AchievementId[];
