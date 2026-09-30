import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import type { HapticCue, HapticsService, SoundCue, SoundService } from './feedback';

const SOURCES: Record<SoundCue, number> = {
  tap: require('../../assets/sounds/tap.wav'),
  tool: require('../../assets/sounds/tool.wav'),
  forge: require('../../assets/sounds/forge.wav'),
  undo: require('../../assets/sounds/undo.wav'),
  invalid: require('../../assets/sounds/invalid.wav'),
  success: require('../../assets/sounds/success.wav'),
};

const VOLUME: Record<SoundCue, number> = { tap: 0.55, tool: 0.45, forge: 0.7, undo: 0.5, invalid: 0.5, success: 0.8 };

/**
 * expo-audio implementation. Players are created lazily and reused. The audio
 * mode mixes with other audio and respects the iOS silent switch, which suits
 * a casual game. Every call is defensive: sound failures never affect play.
 */
export function createExpoSound(): SoundService {
  const players = new Map<SoundCue, AudioPlayer>();
  let configured = false;

  const get = (cue: SoundCue) => {
    let p = players.get(cue);
    if (!p) {
      p = createAudioPlayer(SOURCES[cue]);
      p.volume = VOLUME[cue];
      players.set(cue, p);
    }
    return p;
  };

  return {
    play(cue) {
      try {
        if (!configured) {
          configured = true;
          setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
        }
        const p = get(cue);
        // Rewind only a player that has already played; seeking a fresh player is unnecessary.
        if (p.currentTime > 0) p.seekTo(0).catch(() => {});
        p.play();
      } catch {
        // Ignore — audio is optional.
      }
    },
    preload() {
      try {
        (Object.keys(SOURCES) as SoundCue[]).forEach(get);
      } catch {
        // Ignore — audio is optional.
      }
    },
    dispose() {
      players.forEach((p) => {
        try {
          p.release();
        } catch {}
      });
      players.clear();
    },
  };
}

export function createExpoHaptics(): HapticsService {
  if (Platform.OS === 'web') return { play() {} };
  return {
    play(cue: HapticCue) {
      const run = () => {
        switch (cue) {
          case 'select':
            return Haptics.selectionAsync();
          case 'forge':
            return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          case 'invalid':
            return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          case 'success':
            return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      };
      run().catch(() => {});
    },
  };
}
