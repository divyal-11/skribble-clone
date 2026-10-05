// Audio Manager for Skribbl sound effects
const SOUNDS = {
  roundStart: "/audio/roundStart.ogg",
  roundEndSuccess: "/audio/roundEndSuccess.ogg",
  roundEndFailure: "/audio/roundEndFailure.ogg",
  join: "/audio/join.ogg",
  leave: "/audio/leave.ogg",
  playerGuessed: "/audio/playerGuessed.ogg",
  tick: "/audio/tick.ogg",
} as const;

export type SoundName = keyof typeof SOUNDS;

class SoundManager {
  private cache: Partial<Record<SoundName, HTMLAudioElement>> = {};
  private muted: boolean = false;

  public play(name: SoundName) {
    if (this.muted || typeof window === "undefined") return;
    try {
      let audio = this.cache[name];
      if (!audio) {
        audio = new Audio(SOUNDS[name]);
        this.cache[name] = audio;
      }
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Suppress browser autoplay policy error before first user gesture
      });
    } catch {
      // Audio not supported or blocked
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }
}

export const soundManager = new SoundManager();
