import { Platform } from 'react-native';

/**
 * Tracks whether the most recent interaction was from a keyboard, so focus
 * rings appear for keyboard navigation (web) but not after a tap or click —
 * the same idea as CSS :focus-visible.
 */
let keyboardModality = false;

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const toKeyboard = (e: KeyboardEvent) => {
    if (e.key === 'Tab' || e.key.startsWith('Arrow') || e.key === 'Enter' || e.key === ' ') keyboardModality = true;
  };
  const toPointer = () => {
    keyboardModality = false;
  };
  window.addEventListener('keydown', toKeyboard, true);
  window.addEventListener('pointerdown', toPointer, true);
  window.addEventListener('mousedown', toPointer, true);
  window.addEventListener('touchstart', toPointer, true);
}

/** Native platforms draw their own focus indication; on web we only show ours for keyboard focus. */
export const focusFromKeyboard = () => Platform.OS !== 'web' || keyboardModality;
