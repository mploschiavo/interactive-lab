// Ambient types for the browser runtime the games talk to.
interface KLGameCommonApi {
  wire?(game: string, scoreFn: () => number): () => void;
  level?: { set(n: number): void; up(): void };
  sound?: { beep(freq?: string | number): void };
  steam?: { puff(...args: unknown[]): void };
  ui?: { flash(msg?: string): void; feedback(msg?: string): void };
  telemetry?: { track(...args: unknown[]): void };
  balance?: { get(game?: string): Record<string, number> };
  performance?: { makeFramePacer(): () => boolean };
}
interface Window {
  KLGameCommon?: KLGameCommonApi;
  webkitAudioContext?: typeof AudioContext;
}
interface WindowEventMap {
  "kl-game-action": CustomEvent<{ action: string }>;
  "kl-game-pause-toggle": Event;
  "kl-game-quit": Event;
  "kl-game-replay": Event;
  "kl-game-over": Event;
}
