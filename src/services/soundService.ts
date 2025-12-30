/**
 * Sound Service for Shithead card game
 * Handles all game sound effects with preloading and volume control
 */

export type SoundEffect =
  | 'card-play'
  | 'card-shuffle'
  | 'pile-pickup'
  | 'special-reset'    // 2
  | 'special-glass'    // 3
  | 'special-cap'      // 7
  | 'special-burn'     // 10
  | 'burn-combo'       // 4-of-a-kind
  | 'your-turn'
  | 'player-out'
  | 'game-win'
  | 'game-lose'
  | 'button-click';

// Map sound effects to their file paths
const SOUND_FILES: Record<SoundEffect, string> = {
  'card-play': '/sounds/card-play.mp3',
  'card-shuffle': '/sounds/card-shuffle.mp3',
  'pile-pickup': '/sounds/pile-pickup.mp3',
  'special-reset': '/sounds/special-reset.mp3',
  'special-glass': '/sounds/special-glass.mp3',
  'special-cap': '/sounds/special-cap.mp3',
  'special-burn': '/sounds/special-burn.mp3',
  'burn-combo': '/sounds/burn-combo.mp3',
  'your-turn': '/sounds/your-turn.mp3',
  'player-out': '/sounds/player-out.mp3',
  'game-win': '/sounds/game-win.mp3',
  'game-lose': '/sounds/game-lose.mp3',
  'button-click': '/sounds/button-click.mp3',
};

class SoundService {
  private audioCache: Map<SoundEffect, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.7;
  private initialized: boolean = false;

  /**
   * Initialize and preload all sounds
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    const loadPromises = Object.entries(SOUND_FILES).map(([key, path]) => {
      return this.preloadSound(key as SoundEffect, path);
    });

    await Promise.allSettled(loadPromises);
    this.initialized = true;
    console.log('SoundService initialized');
  }

  /**
   * Preload a single sound
   */
  private async preloadSound(key: SoundEffect, path: string): Promise<void> {
    return new Promise((resolve) => {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.volume = this.volume;

      audio.addEventListener('canplaythrough', () => {
        this.audioCache.set(key, audio);
        resolve();
      }, { once: true });

      audio.addEventListener('error', () => {
        console.warn(`Could not load sound: ${path}`);
        resolve(); // Don't fail, just skip this sound
      }, { once: true });

      // Start loading
      audio.load();
    });
  }

  /**
   * Play a sound effect
   */
  play(sound: SoundEffect): void {
    if (!this.enabled) return;

    const audio = this.audioCache.get(sound);
    if (audio) {
      // Clone the audio to allow overlapping sounds
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = this.volume;
      clone.play().catch(() => {
        // Ignore play errors (e.g., user hasn't interacted yet)
      });
    }
  }

  /**
   * Play sound for special cards
   */
  playSpecialCard(rank: number): void {
    switch (rank) {
      case 2:
        this.play('special-reset');
        break;
      case 3:
        this.play('special-glass');
        break;
      case 7:
        this.play('special-cap');
        break;
      case 10:
        this.play('special-burn');
        break;
      default:
        this.play('card-play');
    }
  }

  /**
   * Enable or disable sounds
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));

    // Update volume for all cached audio
    this.audioCache.forEach((audio) => {
      audio.volume = this.volume;
    });
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }
}

// Export singleton instance
export const soundService = new SoundService();
