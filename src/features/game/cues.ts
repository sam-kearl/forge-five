import type { GameAction, GameState } from '../../engine';
import type { HapticCue, SoundCue } from '../../services/feedback';

/** Decide which (if any) sound and haptic accompany a move. Pure and tested. */
export function cuesFor(prev: GameState, next: GameState, action: GameAction): { sound?: SoundCue; haptic?: HapticCue } {
  if (next.status === 'solved' && prev.status !== 'solved') return { sound: 'success', haptic: 'success' };
  const f = next.feedbackSeq !== prev.feedbackSeq ? next.feedback : null;
  if (f && (f.kind === 'rule' || f.kind === 'forge-unbalanced' || (f.kind === 'parse' && !f.error.incomplete))) {
    return { sound: 'invalid', haptic: 'invalid' };
  }
  switch (action.type) {
    case 'insertPiece':
      return next.snap !== prev.snap ? { sound: 'tap', haptic: 'select' } : { sound: 'invalid' };
    case 'insertOp':
    case 'insertParen':
      return { sound: 'tool', haptic: 'select' };
    case 'forge':
      return f?.kind === 'forged' ? { sound: 'forge', haptic: 'forge' } : { sound: 'invalid' };
    case 'undo':
    case 'redo':
    case 'backspace':
    case 'removeSelection':
    case 'clear':
    case 'breakApart':
      return next.snap !== prev.snap ? { sound: 'undo', haptic: 'select' } : {};
    case 'check':
      // A wrong total is information, not an error: a soft tool click only.
      return { sound: 'tool' };
    default:
      return {};
  }
}
