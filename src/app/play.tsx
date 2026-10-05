import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DIFFICULTY_NAMES, levelOfPuzzle, type Puzzle } from '../engine';
import { GameBoard } from '../features/game/GameBoard';
import { ProofPanel } from '../features/game/ProofPanel';
import { formatTimer, spokenTimer } from '../features/game/timer';
import { useGameSession } from '../features/game/useGameSession';
import { useApp } from '../state/AppContext';
import { Tap } from '../ui/controls';
import { ForgeBackdrop } from '../ui/ForgeBackdrop';
import { Icon } from '../ui/Icon';
import { fonts, palette, radius, space } from '../ui/theme';

const headerTitle = (p: Puzzle) => levelOfPuzzle(p).name + (p.difficulty ? ` · ${DIFFICULTY_NAMES[p.difficulty]}` : '');

export default function Play() {
  const { reduceMotion, stats } = useApp();
  const { state, dispatch, nextPuzzle, runningSince } = useGameSession();
  const [confirmNew, setConfirmNew] = useState(false);

  useEffect(() => {
    if (!confirmNew) return;
    const t = setTimeout(() => setConfirmNew(false), 3000);
    return () => clearTimeout(t);
  }, [confirmNew]);

  const goHome = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const onNew = () => {
    if (state && state.status === 'playing' && state.play.moves > 0 && !confirmNew) {
      setConfirmNew(true);
      return;
    }
    setConfirmNew(false);
    nextPuzzle();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <ForgeBackdrop reduce={reduceMotion} />
      <View style={styles.header}>
        <Tap onPress={goHome} accessibilityLabel="Home" style={styles.headerBtn}>
          <View style={styles.center}>
            <Icon name="home" color={palette.chalk} />
          </View>
        </Tap>
        <Text
          style={styles.levelTitle}
          accessibilityRole="header"
          accessibilityLabel={state ? headerTitle(state.puzzle) : 'Loading puzzle'}
          maxFontSizeMultiplier={1.3}
        >
          {state ? headerTitle(state.puzzle) : ''}
        </Text>
        {state?.status === 'playing' ? (
          <Tap
            onPress={onNew}
            accessibilityLabel={confirmNew ? 'Tap again to deal a new puzzle' : 'New puzzle'}
            style={[styles.newBtn, confirmNew && styles.newBtnConfirm]}
          >
            <View style={styles.newInner}>
              <Icon name="shuffle" color={confirmNew ? palette.brassInk : '#FFB878'} size={18} />
              <Text style={[styles.newText, confirmNew && { color: palette.brassInk }]} maxFontSizeMultiplier={1.3}>
                {confirmNew ? 'Sure?' : 'New'}
              </Text>
            </View>
          </Tap>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>
      {state?.status === 'playing' && <PuzzleTimer bankedMs={state.play.activeMs ?? 0} runningSince={runningSince} />}

      {!state ? (
        <View style={styles.loading}>
          <ActivityIndicator color={palette.ember} />
          <Text style={styles.loadingText}>Preparing a puzzle…</Text>
        </View>
      ) : state.status === 'solved' ? (
        <ProofPanel state={state} reduceMotion={reduceMotion} onNext={nextPuzzle} onHome={goHome} solvedCount={stats.solved} />
      ) : (
        <GameBoard state={state} dispatch={dispatch} reduceMotion={reduceMotion} />
      )}
    </SafeAreaView>
  );
}

/** Time on this puzzle, counting only while the app is open on it. Numbers only: 47, then 1:05. */
function PuzzleTimer({ bankedMs, runningSince }: { bankedMs: number; runningSince: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (runningSince === null) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [runningSince]);
  const ms = bankedMs + (runningSince === null ? 0 : Math.max(0, now - runningSince));
  return (
    <Text
      style={styles.timer}
      accessibilityLabel={`Time on this puzzle: ${spokenTimer(ms)}`}
      maxFontSizeMultiplier={1.3}
      testID="puzzle-timer"
    >
      {formatTimer(ms)}
    </Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.ink },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, minHeight: 52 },
  headerBtn: { borderRadius: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  levelTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 3,
    color: palette.chalk,
    textTransform: 'uppercase',
  },
  newBtn: {
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255,140,60,0.35)',
    backgroundColor: 'rgba(255,110,40,0.08)',
  },
  newBtnConfirm: { backgroundColor: palette.ember, borderColor: palette.ember },
  newInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  newText: { fontFamily: fonts.bold, fontSize: 15, color: '#FFB878' },
  timer: {
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: 2,
    color: palette.timer,
    fontVariant: ['tabular-nums'],
    marginTop: -2,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  loadingText: { fontFamily: fonts.regular, color: palette.mist, fontSize: 15 },
});
