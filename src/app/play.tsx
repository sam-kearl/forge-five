import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameBoard } from '../features/game/GameBoard';
import { ProofPanel } from '../features/game/ProofPanel';
import { useGameSession } from '../features/game/useGameSession';
import { useApp } from '../state/AppContext';
import { Tap } from '../ui/controls';
import { Icon } from '../ui/Icon';
import { fonts, palette, radius, space } from '../ui/theme';

export default function Play() {
  const { reduceMotion, stats } = useApp();
  const { state, dispatch, nextPuzzle } = useGameSession();
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
      <View style={styles.header}>
        <Tap onPress={goHome} accessibilityLabel="Home" style={styles.headerBtn}>
          <View style={styles.center}>
            <Icon name="home" color={palette.chalk} />
          </View>
        </Tap>
        <Text
          style={styles.puzzleId}
          accessibilityLabel={state ? `Puzzle ${state.puzzle.id}` : 'Loading puzzle'}
          maxFontSizeMultiplier={1.3}
        >
          {state ? `Puzzle ${state.puzzle.id}` : ''}
        </Text>
        {state?.status === 'playing' ? (
          <Tap
            onPress={onNew}
            accessibilityLabel={confirmNew ? 'Tap again to deal a new puzzle' : 'New puzzle'}
            style={[styles.newBtn, confirmNew && styles.newBtnConfirm]}
          >
            <View style={styles.newInner}>
              <Icon name="shuffle" color={confirmNew ? palette.brassInk : palette.chalk} size={18} />
              <Text style={[styles.newText, confirmNew && { color: palette.brassInk }]} maxFontSizeMultiplier={1.3}>
                {confirmNew ? 'Sure?' : 'New'}
              </Text>
            </View>
          </Tap>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>

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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.ink },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, minHeight: 52 },
  headerBtn: { borderRadius: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  puzzleId: { flex: 1, textAlign: 'center', fontFamily: fonts.medium, fontSize: 13, color: palette.mist, letterSpacing: 0.5 },
  newBtn: { borderRadius: radius.pill, paddingHorizontal: space.md, borderWidth: 1, borderColor: palette.steelLine },
  newBtnConfirm: { backgroundColor: palette.ember, borderColor: palette.ember },
  newInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  newText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.chalk },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  loadingText: { fontFamily: fonts.regular, color: palette.mist, fontSize: 15 },
});
