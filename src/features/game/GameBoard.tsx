import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
const BREAK_H = 40;

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
  const trayGap = space.sm;
  const pieceW = Math.min(Math.round(76 * scale), Math.floor((contentWidth - trayGap * 4) / 5));
  const keyH = Math.round(52 * scale);
  const actionH = Math.round(50 * scale);
  const capSize = { fontSize: Math.round(13 * scale) };
  const noteSize = { fontSize: Math.round(11 * scale), height: Math.round(15 * scale) };
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
  // A restored game doesn't replay the burst of its last forge.
  const [firstSeq] = useState(state.feedbackSeq);
  const burst = state.feedback?.kind === 'forged' && state.feedbackSeq !== firstSeq ? state.feedbackSeq : 0;
  const { style: shakeStyle, shake } = useShake(reduceMotion);
  const lastSeq = useRef(state.feedbackSeq);
  useEffect(() => {
    if (state.feedbackSeq === lastSeq.current) return;
    lastSeq.current = state.feedbackSeq;
    // Android already reads the message strip (a live region), so only quiet messages are announced there.
    if (feedback && (Platform.OS !== 'android' || !shownFeedback)) AccessibilityInfo.announceForAccessibility(feedback.text);
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
  const bench = fitBench(snap.bench, contentWidth, scale);
  // At most two forged pieces can be in the tray at once (each uses two or more of the five), so they share one row.
  const forgedW = Math.min(pieceW, Math.round(64 * scale));
  // Tall enough for the piece, or for its one-line recipe plus the 40 pt break button, whichever is taller.
  const recipeLine = Math.round(22 * scale);
  const forgedRowH = Math.max(Math.round(forgedW * 0.88), recipeLine + BREAK_H) + space.xs;
  const forgedCapH = Math.round(18 * scale) + space.xs;

  const targetArea = <TargetPlate target={puzzle.target} width={contentWidth} scale={scale} compact={compact} />;

  const trayArea = (
    <View>
      {/* Forged pieces sit above the five. Their space is always reserved, so nothing moves when you forge or break apart. */}
      <View style={{ height: forgedRowH + forgedCapH }}>
        {forgedInTray.length > 0 && (
          <Text
            style={[styles.forgedCaption, capSize, { height: forgedCapH, lineHeight: forgedCapH }]}
            accessibilityRole="header"
            maxFontSizeMultiplier={1}
          >
            FORGED
          </Text>
        )}
        <View style={[styles.forgedRow, { height: forgedRowH }]} accessibilityLabel={forgedInTray.length ? 'Forged pieces' : undefined}>
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
                  <PieceShape label={pieceValueText(p)} look="forged" width={forgedW} pulse={!reduceMotion} />
                </Tap>
                {/* Recipe and break control sit beside the piece, so two forged pieces fit in one row. */}
                <View style={styles.forgedInfo}>
                  <Text
                    style={[styles.recipe, { fontSize: Math.round(18 * scale), lineHeight: recipeLine }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                    maxFontSizeMultiplier={1}
                    importantForAccessibility="no"
                  >
                    {recipeOf(p)}
                  </Text>
                  <Tap
                    onPress={() => dispatch({ type: 'breakApart', pieceId: id })}
                    accessibilityLabel={`Break apart forged ${pieceValueText(p)}`}
                    style={styles.breakBtn}
                  >
                    <View style={styles.breakInner}>
                      <Icon name="split" size={14} color={palette.mist} />
                      <Text style={styles.breakText} maxFontSizeMultiplier={1.2}>
                        break
                      </Text>
                    </View>
                  </Tap>
                </View>
              </PopIn>
            );
          })}
        </View>
      </View>

      {/* Source tray: five fixed slots, so identical values keep distinct positions. */}
      <View style={styles.trayHeader}>
        <Text style={[styles.caption, capSize]} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
          PIECES
        </Text>
        <Text style={[styles.captionMuted, noteSize]} maxFontSizeMultiplier={1.2} accessibilityLabel={trayA11ySummary(state)}>
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
              <Text style={[styles.slotNote, noteSize]} maxFontSizeMultiplier={1.2} importantForAccessibility="no">
                {available ? ' ' : where === 'bench' ? 'placed' : 'forged'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const benchArea = (
    <Animated.View style={shakeStyle}>
      {/* The caption carries the spoken summary; the tokens below stay individually reachable by screen readers. */}
      <Text
        style={[styles.benchCaption, capSize]}
        accessibilityRole="header"
        accessibilityLabel={`Equation. ${spokenBench(snap)} ${analysis.kind === 'value' ? `Current value ${pieceValueTextFromAnalysis(analysis)}.` : ''}`}
        maxFontSizeMultiplier={1.2}
      >
        FORGE YOUR EQUATION HERE
      </Text>
      <View style={styles.benchFrame}>
        <Pressable
          onPress={() => dispatch({ type: 'moveCursor', to: snap.bench.length })}
          accessible={false}
          style={[styles.bench, { height: Math.round(60 * scale), paddingHorizontal: bench.pad }]}
        >
          <GradientFill stops={GRADIENTS.bench} />
          <View style={[styles.benchTokens, { gap: bench.gap, justifyContent: bench.fits ? 'center' : 'flex-end' }]}>
            {snap.bench.length === 0 && (
              <Text style={styles.benchEmpty} maxFontSizeMultiplier={1.4}>
                Your equation takes shape here
              </Text>
            )}
            {snap.bench.map((t, i) => {
              const selected = !!range && i >= range[0] && i <= range[1];
              return (
                <View key={t.id} style={[styles.tokenWrap, { gap: bench.gap }]}>
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
                      <TokenFace state={state} index={i} fit={bench} selected={selected} />
                    </Tap>
                  </PopIn>
                </View>
              );
            })}
            {snap.cursor === snap.bench.length && snap.bench.length > 0 && <Cursor />}
          </View>
          <ForgeBurst trigger={burst} reduce={reduceMotion} />
        </Pressable>
        <Readout message={shownFeedback ?? readout} scale={scale} />
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
        style={[styles.action, { height: actionH, minHeight: actionH }, (hl('forge') || hl('check')) && styles.spotlight]}
      >
        <GradientFill stops={GRADIENTS.molten} />
        <View style={styles.actionInner}>
          <Icon name={primary === 'check' ? 'seal' : 'hammer'} color={palette.brassInk} size={Math.round(24 * scale)} strokeWidth={2.2} />
          <View>
            <Text style={[styles.actionText, { fontSize: Math.round(22 * scale) }]} maxFontSizeMultiplier={1.2}>
              {primary === 'check' ? 'CHECK' : 'FORGE'}
            </Text>
            {range && (
              <Text style={styles.actionSub} maxFontSizeMultiplier={1.1}>
                selected part
              </Text>
            )}
          </View>
        </View>
      </Tap>
    </>
  );

  // Spare height is shared evenly between the sections (the flexible gaps); when there is none, the screen scrolls.
  if (wide) {
    return (
      <View style={styles.wideRoot}>
        <ScrollView style={{ width: contentWidth, flexGrow: 0 }} contentContainerStyle={styles.wideColumn}>
          <Gap />
          {targetArea}
          <Gap />
          {benchArea}
          <Gap />
        </ScrollView>
        <ScrollView style={{ width: contentWidth, flexGrow: 0 }} contentContainerStyle={styles.wideColumn}>
          <Gap />
          {trayArea}
          <Gap />
          <View style={styles.toolsBlock}>{toolsArea}</View>
          <Gap />
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={[styles.column, { width: contentWidth }]}>
        <Gap />
        {targetArea}
        <Gap />
        {benchArea}
        <Gap />
        {trayArea}
        <Gap />
        <View style={styles.toolsBlock}>{toolsArea}</View>
      </View>
    </ScrollView>
  );
}

/** A flexible gap: the sections share any spare height equally. */
function Gap() {
  return <View style={styles.gap} />;
}

interface BenchFit {
  pieceW: number;
  opFont: number;
  opW: number;
  gap: number;
  pad: number;
  /** False when even the smallest sizes can't fit everything on the line. */
  fits: boolean;
}

/**
 * Sizes for the equation so it always fits on one line: pieces are as large as
 * possible (up to the normal size), operators shrink only once pieces get small.
 */
export function fitBench(tokens: readonly { type: string }[], contentWidth: number, scale: number): BenchFit {
  const gap = Math.round(4 * scale);
  const pad = Math.round(4 * scale);
  const pieces = Math.max(1, tokens.filter((t) => t.type === 'piece').length);
  const others = tokens.length - tokens.filter((t) => t.type === 'piece').length;
  const cursorW = 3 + 2 * 2;
  const inner = contentWidth - 2 - pad * 2;
  let opFont = Math.round(28 * scale);
  let opW = Math.round(opFont * 0.6);
  const room = (ow: number) => inner - others * ow - tokens.length * gap - cursorW;
  let pieceW = Math.floor(room(opW) / pieces);
  if (pieceW < 44 * scale) {
    opFont = Math.max(18, Math.round(opFont * 0.8));
    opW = Math.round(opFont * 0.6);
    pieceW = Math.floor(room(opW) / pieces);
  }
  const finalW = Math.max(28, Math.min(Math.round(56 * scale), pieceW));
  // Longer than 5 pieces + 4 operators (extra operators): keep the end, where the cursor is, in view.
  const fits = room(opW) >= finalW * pieces;
  return { pieceW: finalW, opFont, opW, gap, pad, fits };
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

function TokenFace({ state, index, fit, selected }: { state: GameState; index: number; fit: BenchFit; selected: boolean }) {
  const t = state.snap.bench[index];
  if (t.type === 'piece') {
    const p = state.snap.pieces[t.pieceId];
    return <PieceShape label={pieceValueText(p)} look={p.kind === 'forged' ? 'forged' : 'source'} width={fit.pieceW} selected={selected} />;
  }
  return (
    <Text allowFontScaling={false} style={[styles.opText, { fontSize: fit.opFont, width: fit.opW }]}>
      {t.type === 'op' ? OP_SYMBOL[t.op] : t.type === 'lparen' ? '(' : ')'}
    </Text>
  );
}

const TONE_COLOR: Record<Message['tone'], string> = {
  neutral: palette.mist,
  good: palette.success,
  issue: palette.quench,
  info: palette.amberText,
};

/** The message strip under the equation: a fixed two-line height, so changing messages never moves anything. */
function Readout({ message, scale }: { message: Message; scale: number }) {
  // "= 24  ✓ matches the target" shows the value large and the rest at message size.
  const split = message.text.startsWith('=') ? message.text.indexOf('  ') : -1;
  const value = split > 0 ? message.text.slice(0, split) : message.text.startsWith('=') ? message.text : null;
  const rest = value === null ? message.text : message.text.slice(value.length).trim();
  const fontSize = Math.round(14 * scale);
  const lineHeight = Math.round(20 * scale);
  return (
    <View style={[styles.readout, { height: lineHeight * 2 + 10 }]} accessibilityLiveRegion="polite">
      {message.tone === 'issue' && <Icon name="info" size={16} color={TONE_COLOR.issue} />}
      <Text
        style={[styles.readoutText, { fontSize, lineHeight, color: TONE_COLOR[message.tone] }]}
        numberOfLines={2}
        maxFontSizeMultiplier={1.15}
      >
        {value !== null && (
          <Text style={[styles.readoutValue, { fontSize: Math.round(20 * scale), lineHeight }]}>
            {value}
            {rest ? '  ' : ''}
          </Text>
        )}
        {rest}
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
      // Leave browser shortcuts (find, zoom, switching tabs, cut) alone; only Cmd/Ctrl+Z is the game's.
      if ((e.metaKey || e.ctrlKey || e.altKey) && k.toLowerCase() !== 'z') return;
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
  wideColumn: { flexGrow: 1, paddingVertical: space.md },
  scrollContent: { flexGrow: 1, paddingBottom: space.sm },
  column: { alignSelf: 'center', flexGrow: 1 },
  gap: { flexGrow: 1, minHeight: space.sm },
  toolsBlock: { gap: space.xs + 2 },
  trayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: space.xs },
  caption: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 3, color: palette.mist },
  captionMuted: { fontFamily: fonts.regular, fontSize: 12, color: palette.dim },
  benchCaption: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 3, color: palette.mist, marginBottom: space.xs },
  forgedCaption: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 3, color: '#FFB878' },
  trayRow: { flexDirection: 'row', justifyContent: 'center' },
  pieceTap: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  slotNote: { fontFamily: fonts.medium, fontSize: 11, color: palette.dim, height: 15, marginTop: 1 },
  spotlight: { borderRadius: radius.md, borderWidth: 3, borderColor: palette.ember },
  forgedRow: { flexDirection: 'row', gap: space.lg, justifyContent: 'center', alignItems: 'center' },
  forgedItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1, maxWidth: '50%' },
  forgedInfo: { alignItems: 'flex-start', flexShrink: 1 },
  recipe: { fontFamily: fonts.display, fontSize: 18, color: palette.amberText },
  // 40 pt tall plus Tap's 4 pt hit slop on each side gives a 48 pt touch target.
  breakBtn: { height: BREAK_H, minHeight: BREAK_H, minWidth: 64, borderRadius: radius.pill, paddingHorizontal: space.xs },
  breakInner: { flexDirection: 'row', alignItems: 'center', gap: 4, height: BREAK_H },
  breakText: { fontFamily: fonts.medium, fontSize: 12, color: palette.mist },
  benchFrame: {
    borderRadius: radius.lg + 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,140,60,0.28)',
    boxShadow: '0 0 24px rgba(255,100,30,0.12)',
  },
  bench: { backgroundColor: palette.plateBottom, justifyContent: 'center' },
  benchTokens: { flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', overflow: 'hidden' },
  benchEmpty: { fontFamily: fonts.regular, fontSize: 15, color: palette.dim },
  tokenWrap: { flexDirection: 'row', alignItems: 'center' },
  // Bench tokens are as narrow as their contents (the bench is 60+ pt tall, so taps stay easy).
  token: { minWidth: 0, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  tokenSelected: { backgroundColor: 'rgba(255,179,71,0.18)', borderBottomWidth: 3, borderBottomColor: palette.ember },
  opText: { fontFamily: fonts.black, fontSize: 28, color: '#E9D6C3', textAlign: 'center', includeFontPadding: false },
  cursor: {
    width: 3,
    height: 40,
    borderRadius: 2,
    backgroundColor: palette.ember,
    marginHorizontal: 2,
    boxShadow: '0 0 10px #FF8A2A',
    alignSelf: 'center',
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
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
