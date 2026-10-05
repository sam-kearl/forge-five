import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gameReducer, type GameAction, type GameState } from '../engine';
import { cuesFor } from '../features/game/cues';
import { GameBoard } from '../features/game/GameBoard';
import { ProofPanel } from '../features/game/ProofPanel';
import { createTutorialGame, OFF_SCRIPT_HINT, TUTORIAL_OUTRO, TUTORIAL_STEPS } from '../features/tutorial/script';
import { useApp } from '../state/AppContext';
import { Button, Tap } from '../ui/controls';
import { ForgeBackdrop } from '../ui/ForgeBackdrop';
import { Icon } from '../ui/Icon';
import { fonts, palette, radius, space } from '../ui/theme';

export default function Tutorial() {
  const { reduceMotion, cue, setTutorialCompleted, stats } = useApp();
  const [state, setState] = useState<GameState>(() => createTutorialGame(Date.now()));
  const [stepIndex, setStepIndex] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const step = TUTORIAL_STEPS[Math.min(stepIndex, TUTORIAL_STEPS.length - 1)];
  const finished = state.status === 'solved';

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${step.title}. ${step.body}`);
  }, [stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Solving the tutorial puzzle counts as completing it, even if the player then leaves.
  useEffect(() => {
    if (finished) setTutorialCompleted(true);
  }, [finished, setTutorialCompleted]);

  const advance = useCallback(() => {
    setHint(null);
    setStepIndex((i) => i + 1);
  }, []);

  const dispatch = useCallback(
    (a: GameAction) => {
      const s = state;
      // Only the move the current step asks for is accepted.
      const current = TUTORIAL_STEPS[stepIndex];
      if (!current?.expects || !current.expects(a, s)) {
        setHint(OFF_SCRIPT_HINT);
        cue('invalid');
        return;
      }
      const next = gameReducer(s, a);
      if (current.done && !current.done(next)) {
        setHint(OFF_SCRIPT_HINT);
        return;
      }
      const c = cuesFor(s, next, a);
      cue(c.sound, c.haptic);
      setState(next);
      advance();
    },
    [state, stepIndex, cue, advance],
  );

  const finish = () => {
    setTutorialCompleted(true);
    router.replace('/play');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <ForgeBackdrop reduce={reduceMotion} />
      <View style={styles.header}>
        <Tap
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityLabel="Leave tutorial"
          style={styles.headerBtn}
        >
          <View style={styles.center}>
            <Icon name="close" color={palette.chalk} />
          </View>
        </Tap>
        <Text style={styles.headerTitle} accessibilityRole="header">
          How to play
        </Text>
        <Tap onPress={finish} accessibilityLabel="Skip tutorial" style={styles.skip}>
          <Text style={styles.skipText}>Skip</Text>
        </Tap>
      </View>

      {finished ? (
        <ProofPanel
          state={state}
          reduceMotion={reduceMotion}
          onNext={finish}
          nextLabel="Start playing"
          solvedCount={stats.solved}
          showAd={false}
        >
          <View style={styles.outro}>
            <Text style={styles.coachTitle}>{TUTORIAL_OUTRO.title}</Text>
            <Text style={styles.coachBody}>{TUTORIAL_OUTRO.body}</Text>
          </View>
        </ProofPanel>
      ) : (
        <>
          <View style={styles.coach} accessibilityLiveRegion="polite">
            <View style={styles.coachText}>
              <Text style={styles.coachTitle} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
                <Text style={styles.progress} accessibilityLabel={`Step ${stepIndex + 1} of ${TUTORIAL_STEPS.length}.`}>
                  {stepIndex + 1}/{TUTORIAL_STEPS.length}
                  {'  '}
                </Text>
                {step.title}
              </Text>
              <Text style={styles.coachBody} maxFontSizeMultiplier={1.6}>
                {step.body}
              </Text>
              {hint && <Text style={styles.hint}>{hint}</Text>}
            </View>
            {!step.expects && <Button title="Next" onPress={advance} style={styles.next} testID="tutorial-next" />}
          </View>
          <GameBoard state={state} dispatch={dispatch} reduceMotion={reduceMotion} highlight={step.highlight(state)} compact />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.ink },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, minHeight: 52 },
  headerBtn: { borderRadius: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 3,
    color: palette.chalk,
    textTransform: 'uppercase',
  },
  skip: { paddingHorizontal: space.md, justifyContent: 'center' },
  skipText: { fontFamily: fonts.semibold, color: palette.mist, fontSize: 15 },
  coach: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 92,
    marginHorizontal: space.lg,
    marginBottom: space.xs,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    backgroundColor: palette.steel,
    borderWidth: 1,
    borderColor: 'rgba(255,140,60,0.2)',
    borderLeftWidth: 4,
    borderLeftColor: palette.ember,
    maxWidth: 600,
    alignSelf: 'center',
    width: '92%',
  },
  coachText: { flex: 1 },
  progress: { fontFamily: fonts.medium, fontSize: 12, color: palette.mist },
  coachTitle: { fontFamily: fonts.bold, fontSize: 16, color: palette.chalk },
  coachBody: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: palette.chalk, marginTop: 2 },
  hint: { fontFamily: fonts.medium, fontSize: 13, color: palette.ember, marginTop: space.xs },
  next: { minHeight: 44, paddingHorizontal: space.md },
  outro: { alignSelf: 'stretch', padding: space.md, backgroundColor: palette.steel, borderRadius: radius.lg },
});
