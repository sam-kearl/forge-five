/**
 * Sound and haptics interfaces. Implementations live in *.native/*.expo files;
 * silent implementations are used in tests and when a player turns them off.
 */

export type SoundCue = 'tap' | 'tool' | 'forge' | 'undo' | 'invalid' | 'success';
export type HapticCue = 'select' | 'forge' | 'invalid' | 'success';

export interface SoundService {
  play(cue: SoundCue): void;
  dispose(): void;
}

export interface HapticsService {
  play(cue: HapticCue): void;
}

export const silentSound: SoundService = { play() {}, dispose() {} };
export const noHaptics: HapticsService = { play() {} };
