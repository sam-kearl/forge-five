import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  analyzeBench,
  OP_SYMBOL,
  OP_WORD,
  primaryAction,
  recipeOf,
  selectionRange,
  type Feedback,
  type GameAction,
  type GameState,
  type Op,
} from '../../engine';
import { ToolKey, Tap } from '../../ui/controls';
import { GradientFill, GRADIENTS } from '../../ui/GradientFill';
import { Icon } from '../../ui/Icon';
import { ForgeBurst, PopIn, useShake } from '../../ui/motion';
import { PieceShape } from '../../ui/PieceShape';
import { TargetPlate } from '../../ui/TargetPlate';
import { fonts, palette, radius, space } from '../../ui/theme';
import {
  feedbackMessage,
  pieceA11yLabel,
  pieceValueText,
  readoutMessage,
  spokenBench,
  spokenToken,
  trayA11ySummary,
  type Message,
} from './messages';

/** Identifiers for controls that the tutorial can spotlight. */
export type ControlKey = `piece:${string}` | `op:${Op}` | 'forge' | 'check' | 'undo' | 'redo' | 'backspace' | 'clear' | 'forged';

export interface GameBoardProps {
  state: GameState;
  dispatch: (a: GameAction) => void;
  reduceMotion: boolean;
  /** Controls to draw attention to (tutorial). */
  highlight?: readonly ControlKey[];
  /** Hide the target (tutorial intro can reveal it later). */
  compact?: boolean;
}

const OPS: Op[] = ['add', 'sub', 'mul', 'div'];

/** Routine confirmations that would only add noise on screen (still announced to screen readers). */
const QUIET_FEEDBACK = new Set<Feedback['kind']>([
  'forged',
  'broken-apart',
  'undone',
  'redone',
  'cleared',
  'nothing-to-undo',
  'nothing-to-redo',
]);

export function GameBoard({ state, dispatch, reduceMotion, highlight = [], compact }: GameBoardProps) {
  const { width, height } = useWindowDimensions();
  // Wide, landscape screens (tablets sideways, Chromebooks, desktop browsers) get two columns
  // instead of a stretched phone layout.
  const wide = width >= 900 && width > height * 1.15;
  const contentWidth = wide ? Math.min(540, Math.floor((width - space.lg * 3) / 2)) : Math.min(width - space.lg * 2, 640);
  const scale = Math.min(1.3, Math.max(1, contentWidth / 420));
  const hasForged = state.snap.tray.some((id) => state.snap.pieces[id].kind === 'forged');
  // Compact the target on shorter phones, and while forged pieces take tray space, so the bench stays in view.
  const compactTarget = compact ?? (!wide && (height < 760 || (hasForged && height < 940)));
  const trayGap = space.sm;
  const pieceW = Math.min(Math.round(76 * scale), Math.floor((contentWidth - trayGap * 4) / 5));
  const benchPieceW = Math.min(Math.round(54 * scale), Math.max(42, Math.floor(contentWidth / 8.2)));
  const keyH = Math.round(52 * scale);
  const { snap, puzzle } = state;

  const analysis = useMemo(() => analyzeBench(state), [state.snap, state.puzzle]); // eslint-disable-line react-hooks/exhaustive-deps
  const readout = readoutMessage(state, analysis);
  const feedback = feedbackMessage(state);
  // The last action's message (if it is worth showing) replaces the live readout until the next move.
  const shownFeedback = state.feedback && QUIET_FEEDBACK.has(state.feedback.kind) ? null : feedback;
  const primary = primaryAction(state);
  const range = selectionRange(state.selection);
  const hl = (k: ControlKey) => highlight.includes(k);

  // Announce feedback to screen readers and animate forge/invalid moments.
  // Each forge gets a new feedbackSeq, which re-triggers the burst animation.
  const burst = state.feedback?.kind === 'forged' ? state.feedbackSeq : 0;
  const { style: shakeStyle, shake } = useShake(reduceMotion);
  const lastSeq = useRef(state.feedbackSeq);
  useEffect(() => {
    if (state.feedbackSeq === lastSeq.current) return;
    lastSeq.current = state.feedbackSeq;
    if (feedback) AccessibilityInfo.announceForAccessibility(feedback.text);
    if (feedback?.tone === 'issue') shake();
  }, [state.feedbackSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  // Web keyboard support: same restrictions as taps (numbers map to available pieces only).
  useKeyboard(state, dispatch);

  const sourceStatus = (id: string) => {
    if (snap.tray.includes(id)) return 'tray';
    if (snap.bench.some((t) => t.type === 'piece' && t.pieceId === id)) return 'bench';
    return 'forged';
  };
  const forgedInTray = snap.tray.filter((id) => snap.pieces[id].kind === 'forged');

  const targetArea = <TargetPlate target={puzzle.target} width={contentWidth} compact={compactTarget} />;

  const trayArea = (
    <>
      {/* Source tray: five fixed slots, so identical values keep distinct positions. */}
      <View style={styles.trayHeader}>
        <Text style={styles.caption} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
          PIECES
        </Text>
        <Text style={styles.captionMuted} maxFontSizeMultiplier={1.4} accessibilityLabel={trayA11ySummary(state)}>
          use each once
        </Text>
      </View>
      <View style={[styles.trayRow, { gap: trayGap }]}>
        {puzzle.sources.map((s) => {
          const where = sourceStatus(s.id);
          const available = where === 'tray';
          const label = pieceA11yLabel(state, s.id);
          return (
            <View key={s.id} style={{ alignItems: 'center', width: pieceW }}>
              <Tap
                testID={`tray-${s.id}`}
                onPress={() => dispatch({ type: 'insertPiece', pieceId: s.id })}
                disabled={!available}
                accessibilityLabel={available ? label : `${label}, ${where === 'bench' ? 'in the equation' : 'forged into another piece'}`}
                accessibilityHint={available ? 'Places this number on the bench' : undefined}
                style={[styles.pieceTap, hl(`piece:${s.id}`) && styles.spotlight]}
              >
                <PieceShape label={pieceValueText(s)} look={available ? 'source' : 'socket'} width={pieceW} />
              </Tap>
              <Text style={styles.slotNote} maxFontSizeMultiplier={1.2} importantForAccessibility="no">
                {available ? ' ' : where === 'bench' ? 'placed' : 'forged'}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Forged pieces appear below the original five, pushing them up so the newest piece sits just above the tools. */}
      {forgedInTray.length > 0 && (
        <Text style={styles.forgedCaption} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
          FORGED
        </Text>
      )}
      {forgedInTray.length > 0 && (
        <View style={styles.forgedRow} accessibilityLabel="Forged pieces">
          {forgedInTray.map((id) => {
            const p = snap.pieces[id];
            if (p.kind !== 'forged') return null;
            return (
              <PopIn key={id} reduce={reduceMotion} style={styles.forgedItem}>
                <Tap
                  testID={`tray-${id}`}
                  onPress={() => dispatch({ type: 'insertPiece', pieceId: id })}
                  accessibilityLabel={pieceA11yLabel(state, id)}
                  accessibilityHint="Places this forged piece on the bench"
                  accessibilityActions={[{ name: 'breakApart', label: 'Break apart' }]}
                  onAccessibilityAction={(e) => e.nativeEvent.actionName === 'breakApart' && dispatch({ type: 'breakApart', pieceId: id })}
                  style={[styles.pieceTap, hl('forged') && styles.spotlight]}
                >
                  <PieceShape label={pieceValueText(p)} look="forged" width={pieceW} pulse={!reduceMotion} />
                </Tap>
                {/* Recipe and break control sit beside the piece to keep the tray short. */}
                <View style={styles.forgedInfo}>
                  <Text style={styles.recipe} numberOfLines={2} maxFontSizeMultiplier={1.3} importantForAccessibility="no">
                    {recipeOf(p)}
                  </Text>
                  <Tap
                    onPress={() => dispatch({ type: 'breakApart', pieceId: id })}
                    accessibilityLabel={`Break apart forged ${pieceValueText(p)}`}
                    style={styles.breakBtn}
                  >
                    <View style={styles.breakInner}>
                      <Icon name="split" size={14} color={palette.mist} />
                      <Text style={styles.breakText} maxFontSizeMultiplier={1.3}>
                        break
                      </Text>
                    </View>
                  </Tap>
                </View>
              </PopIn>
            );
          })}
        </View>
      )}
    </>
  );

  const benchArea = (
    <Animated.View style={shakeStyle}>
      <Text style={styles.benchCaption} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
        FORGE YOUR EQUATION HERE
      </Text>
      <View style={styles.benchFrame}>
        <Pressable onPress={() => dispatch({ type: 'moveCursor', to: snap.bench.length })} accessible={false} style={styles.bench}>
          <GradientFill stops={GRADIENTS.bench} />
          <View
            style={styles.benchTokens}
            accessible
            accessibilityLabel={`${spokenBench(snap)} ${analysis.kind === 'value' ? `Current value ${pieceValueTextFromAnalysis(analysis)}.` : ''}`}
            accessibilityHint="Use the tools below to edit. Tap a token to select it."
          >
            {snap.bench.length === 0 && (
              <Text style={styles.benchEmpty} maxFontSizeMultiplier={1.4}>
                Your equation takes shape here
              </Text>
            )}
            {snap.bench.map((t, i) => {
              const selected = !!range && i >= range[0] && i <= range[1];
              return (
                <View key={t.id} style={styles.tokenWrap}>
                  {snap.cursor === i && <Cursor />}
                  <PopIn reduce={reduceMotion}>
                    <Tap
                      testID={`bench-${i}`}
                      onPress={() => dispatch({ type: 'tapToken', index: i })}
                      selected={selected}
                      accessibilityLabel={`${spokenToken(snap, t)}, position ${i + 1} of ${snap.bench.length}${selected ? ', selected' : ''}`}
                      accessibilityHint="Selects this token. Tap another token to extend the selection."
                      style={[styles.token, selected && styles.tokenSelected]}
                    >
                      <TokenFace state={state} index={i} benchPieceW={benchPieceW} selected={selected} />
                    </Tap>
                  </PopIn>
                </View>
              );
            })}
            {snap.cursor === snap.bench.length && snap.bench.length > 0 && <Cursor />}
          </View>
          <ForgeBurst trigger={burst} reduce={reduceMotion} />
        </Pressable>
        <Readout message={shownFeedback ?? readout} />
      </View>
    </Animated.View>
  );

  const toolsArea = (
    <>
      <View style={styles.toolRow}>
        {OPS.map((op) => (
          <Slot key={op} on={hl(`op:${op}`)}>
            <ToolKey
              height={keyH}
              symbol={OP_SYMBOL[op]}
              label={OP_WORD[op]}
              onPress={() => dispatch({ type: 'insertOp', op })}
              testID={`key-${op}`}
            />
          </Slot>
        ))}
      </View>
      <View style={styles.toolRow}>
        <Slot on={hl('backspace')}>
          <ToolKey
            height={keyH}
            icon="backspace"
            label={range ? 'Remove selection' : 'Delete'}
            onPress={() => dispatch({ type: 'backspace' })}
            disabled={!range && snap.cursor === 0}
            testID="key-backspace"
          />
        </Slot>
        <Slot on={hl('undo')}>
          <ToolKey
            height={keyH}
            icon="undo"
            label="Undo"
            onPress={() => dispatch({ type: 'undo' })}
            disabled={state.past.length === 0}
            testID="key-undo"
          />
        </Slot>
        <Slot on={hl('redo')}>
          <ToolKey
            height={keyH}
            icon="redo"
            label="Redo"
            onPress={() => dispatch({ type: 'redo' })}
            disabled={state.future.length === 0}
            testID="key-redo"
          />
        </Slot>
        <Slot on={hl('clear')}>
          <ToolKey
            height={keyH}
            icon="clear"
            tone="danger"
            label="Clear bench and restore all pieces"
            onPress={() => dispatch({ type: 'clear' })}
            testID="key-clear"
          />
        </Slot>
      </View>
      {/* One action button: forges until every piece is on the bench, then checks. */}
      <Tap
        testID="key-primary"
        onPress={() => dispatch({ type: primary, now: Date.now() })}
        accessibilityLabel={
          primary === 'check' ? 'Check equation' : range ? 'Forge selection into one piece' : 'Forge the bench into one piece'
        }
        accessibilityHint={
          primary === 'check'
            ? 'Tests whether your equation uses all five pieces and makes the target'
            : 'Fuses a calculation into a single new piece you can use later'
        }
        style={[styles.action, { minHeight: keyH + 8 }, (hl('forge') || hl('check')) && styles.spotlight]}
      >
        <GradientFill stops={GRADIENTS.molten} />
        <View style={styles.actionInner}>
          <Icon name={primary === 'check' ? 'seal' : 'hammer'} color={palette.brassInk} size={28} strokeWidth={2.2} />
          <View>
            <Text style={styles.actionText} maxFontSizeMultiplier={1.4}>
              {primary === 'check' ? 'CHECK' : 'FORGE'}
            </Text>
            {range && (
              <Text style={styles.actionSub} maxFontSizeMultiplier={1.2}>
                selected part
              </Text>
            )}
          </View>
        </View>
      </Tap>
    </>
  );

  if (wide) {
    return (
      <View style={styles.wideRoot}>
        <ScrollView style={{ width: contentWidth, flexGrow: 0 }} contentContainerStyle={styles.wideColumn}>
          {targetArea}
          {benchArea}
        </ScrollView>
        <View style={[styles.wideRight, { width: contentWidth }]}>
          {trayArea}
          <View style={styles.wideTools}>{toolsArea}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.column, { width: contentWidth }]}>
          {targetArea}
          {benchArea}
        </View>
      </ScrollView>

      {/* Pieces and tools stay anchored at the bottom so they never move while the equation grows. */}
      <View style={[styles.tools, { width: contentWidth }]}>
        {trayArea}
        {toolsArea}
      </View>
    </View>
  );
}

/** An equal-width cell in a tool row; draws the tutorial spotlight when `on`. */
function Slot({ on, children }: { on: boolean; children: ReactNode }) {
  return <View style={[styles.slot, on && styles.spotlight]}>{children}</View>;
}

function pieceValueTextFromAnalysis(a: ReturnType<typeof analyzeBench>) {
  return a.kind === 'value' ? `${a.value.num}${a.value.den === 1 ? '' : `/${a.value.den}`}` : '';
}

function Cursor() {
  return <View style={styles.cursor} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}

function TokenFace({ state, index, benchPieceW, selected }: { state: GameState; index: number; benchPieceW: number; selected: boolean }) {
  const t = state.snap.bench[index];
  if (t.type === 'piece') {
    const p = state.snap.pieces[t.pieceId];
    return (
      <PieceShape label={pieceValueText(p)} look={p.kind === 'forged' ? 'forged' : 'source'} width={benchPieceW} selected={selected} />
    );
  }
  if (t.type === 'op') {
    return (
      <Text allowFontScaling={false} style={styles.opText}>
        {OP_SYMBOL[t.op]}
      </Text>
    );
  }
  return (
    <Text allowFontScaling={false} style={styles.parenText}>
      {t.type === 'lparen' ? '(' : ')'}
    </Text>
  );
}

const TONE_COLOR: Record<Message['tone'], string> = {
  neutral: palette.mist,
  good: palette.success,
  issue: palette.quench,
  info: palette.amberText,
};

function Readout({ message }: { message: Message }) {
  return (
    <View style={styles.readout} accessibilityLiveRegion="polite">
      {message.tone === 'issue' && <Icon name="info" size={16} color={TONE_COLOR.issue} />}
      <Text
        style={[styles.readoutText, { color: TONE_COLOR[message.tone] }, message.text.startsWith('=') && styles.readoutValue]}
        maxFontSizeMultiplier={1.5}
      >
        {message.text}
      </Text>
    </View>
  );
}

function useKeyboard(state: GameState, dispatch: (a: GameAction) => void) {
  const ref = useRef({ state, dispatch });
  useEffect(() => {
    ref.current = { state, dispatch };
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    let digits = '';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const placeDigits = () => {
      const { state: s, dispatch: d } = ref.current;
      const n = Number(digits);
      digits = '';
      const id = s.snap.tray.find((pid) => s.snap.pieces[pid].value.num === n && s.snap.pieces[pid].value.den === 1);
      d(id ? { type: 'insertPiece', pieceId: id } : { type: 'insertPiece', pieceId: `unavailable:${n}` });
    };
    const onKey = (e: KeyboardEvent) => {
      // Key events can target the window itself, so only treat real elements as targets.
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const { state: s, dispatch: d } = ref.current;
      const k = e.key;
      if (/^[0-9]$/.test(k)) {
        digits += k;
        clearTimeout(timer);
        // Wait briefly for a second digit (e.g. "12") unless no available piece could start with these digits.
        const couldGrow = s.snap.tray.some(
          (pid) => String(s.snap.pieces[pid].value.num).startsWith(digits) && String(s.snap.pieces[pid].value.num) !== digits,
        );
        if (couldGrow) timer = setTimeout(placeDigits, 450);
        else placeDigits();
        e.preventDefault();
        return;
      }
      const map: Record<string, GameAction> = {
        '+': { type: 'insertOp', op: 'add' },
        '-': { type: 'insertOp', op: 'sub' },
        '*': { type: 'insertOp', op: 'mul' },
        x: { type: 'insertOp', op: 'mul' },
        '/': { type: 'insertOp', op: 'div' },
        Backspace: { type: 'backspace' },
        ArrowLeft: { type: 'moveCursor', to: s.snap.cursor - 1 },
        ArrowRight: { type: 'moveCursor', to: s.snap.cursor + 1 },
        Home: { type: 'moveCursor', to: 0 },
        End: { type: 'moveCursor', to: s.snap.bench.length },
        Escape: { type: 'clearSelection' },
        f: { type: 'forge', now: Date.now() },
      };
      if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === 'z') {
        d(e.shiftKey ? { type: 'redo' } : { type: 'undo' });
        e.preventDefault();
        return;
      }
      if (k === 'Enter' && !(target && target.getAttribute('role') === 'button')) {
        d({ type: primaryAction(s), now: Date.now() });
        e.preventDefault();
        return;
      }
      const a = map[k];
      if (a) {
        d(a);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, []);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  wideRoot: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.xl },
  wideColumn: { gap: space.sm, justifyContent: 'center', flexGrow: 1, paddingVertical: space.lg },
  wideRight: { gap: space.sm, justifyContent: 'center' },
  wideTools: { gap: space.xs + 2 },
  scrollContent: { paddingTop: space.xs, paddingBottom: space.md },
  column: { alignSelf: 'center', gap: space.sm },
  tools: { alignSelf: 'center', gap: space.xs + 2, paddingTop: space.xs, paddingBottom: space.sm },
  flex: { flex: 1 },
  trayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: space.xs },
  caption: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 3, color: palette.mist },
  captionMuted: { fontFamily: fonts.regular, fontSize: 12, color: palette.dim },
  benchCaption: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 3, color: palette.mist, marginBottom: space.xs },
  forgedCaption: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 3, color: '#FFB878', marginBottom: -2 },
  trayRow: { flexDirection: 'row', justifyContent: 'center' },
  pieceTap: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  slotNote: { fontFamily: fonts.medium, fontSize: 11, color: palette.dim, height: 15, marginTop: 1 },
  spotlight: { borderRadius: radius.md, borderWidth: 3, borderColor: palette.ember },
  forgedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' },
  forgedItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm, maxWidth: 260 },
  forgedInfo: { alignItems: 'flex-start', flexShrink: 1 },
  recipe: { fontFamily: fonts.display, fontSize: 18, color: palette.amberText },
  breakBtn: { minHeight: 36, minWidth: 0, borderRadius: radius.pill, paddingHorizontal: space.xs },
  breakInner: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 },
  breakText: { fontFamily: fonts.medium, fontSize: 12, color: palette.mist },
  benchFrame: {
    borderRadius: radius.lg + 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,140,60,0.28)',
    boxShadow: '0 0 24px rgba(255,100,30,0.12)',
  },
  bench: {
    minHeight: 92,
    backgroundColor: palette.plateBottom,
    paddingHorizontal: space.sm,
    paddingVertical: space.md,
    justifyContent: 'center',
  },
  benchTokens: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', rowGap: space.sm },
  benchEmpty: { fontFamily: fonts.regular, fontSize: 15, color: palette.dim },
  tokenWrap: { flexDirection: 'row', alignItems: 'center' },
  token: { minWidth: 30, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, paddingHorizontal: 2 },
  tokenSelected: { backgroundColor: 'rgba(255,179,71,0.18)', borderBottomWidth: 3, borderBottomColor: palette.ember },
  opText: { fontFamily: fonts.black, fontSize: 32, color: '#E9D6C3', paddingHorizontal: 3, includeFontPadding: false },
  parenText: { fontFamily: fonts.regular, fontSize: 42, color: palette.mist, includeFontPadding: false, marginTop: -4 },
  cursor: {
    width: 3,
    height: 40,
    borderRadius: 2,
    backgroundColor: palette.ember,
    marginHorizontal: 2,
    boxShadow: '0 0 10px #FF8A2A',
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 52,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    backgroundColor: '#0E0A08',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,140,60,0.18)',
  },
  readoutText: { fontFamily: fonts.medium, fontSize: 14, flexShrink: 1 },
  readoutValue: { fontFamily: fonts.black, fontSize: 24, color: palette.ember, fontVariant: ['tabular-nums'] },
  toolRow: { flexDirection: 'row', gap: space.xs + 2 },
  slot: { flex: 1, minWidth: 0 },
  action: {
    minHeight: 60,
    borderRadius: radius.lg + 2,
    justifyContent: 'center',
    marginTop: space.xs,
    overflow: 'hidden',
    backgroundColor: palette.brass,
    borderWidth: 1,
    borderColor: '#FFE2A6',
    boxShadow: '0 0 34px rgba(255,140,40,0.45)',
  },
  actionInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm + 2 },
  actionText: { fontFamily: fonts.black, fontSize: 24, letterSpacing: 3, color: palette.brassInk },
  actionSub: { fontFamily: fonts.medium, fontSize: 11, color: palette.brassInk, marginTop: -2 },
});
