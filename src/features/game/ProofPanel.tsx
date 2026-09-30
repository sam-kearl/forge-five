import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatExpr, type GameState } from '../../engine';
import { AdSlot } from '../ads/AdSlot';
import { Button } from '../../ui/controls';
import { Icon } from '../../ui/Icon';
import { PieceShape } from '../../ui/PieceShape';
import { Seal } from '../../ui/Seal';
import { fonts, palette, radius, space } from '../../ui/theme';
import { spokenExpr } from './messages';

function duration(ms: number): string {
  const s = Math.max(1, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${String(s % 60).padStart(2, '0')} s`;
}

/** The completion state: the stamped proof, every piece checked off, and a clear next step. */
export function ProofPanel({
  state,
  reduceMotion,
  onNext,
  onHome,
  solvedCount,
  nextLabel = 'Next puzzle',
  showAd = true,
  children,
}: {
  state: GameState;
  reduceMotion: boolean;
  onNext: () => void;
  onHome?: () => void;
  solvedCount: number;
  nextLabel?: string;
  showAd?: boolean;
  children?: ReactNode;
}) {
  const { puzzle, solution, play } = state;
  if (!solution) return null;
  const proof = formatExpr(solution);
  const spokenProof = `${spokenExpr(solution)} equals ${puzzle.target}`;
  const took = play.solvedAt ? duration(play.solvedAt - play.startedAt) : null;

  return (
    <ScrollView contentContainerStyle={styles.wrap} accessibilityViewIsModal>
      <Seal reduce={reduceMotion} />
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
        Solved!
      </Text>
      <View style={styles.proofCard} accessible accessibilityLabel={`Proof: ${spokenProof}`}>
        <Text style={styles.proofLabel}>PROOF</Text>
        <Text style={styles.proof} maxFontSizeMultiplier={1.6} adjustsFontSizeToFit numberOfLines={3}>
          {proof}
        </Text>
        <Text style={styles.proofResult} maxFontSizeMultiplier={1.6}>
          = {puzzle.target}
        </Text>
      </View>

      <View
        style={styles.checklist}
        accessible
        accessibilityLabel={`All five pieces used: ${puzzle.sources.map((s) => s.value.num).join(', ')}.`}
      >
        {puzzle.sources.map((s) => (
          <View key={s.id} style={styles.checkItem}>
            <PieceShape label={String(s.value.num)} look="source" width={44} />
            <View style={styles.tick}>
              <Icon name="check" size={14} color={palette.brassInk} strokeWidth={3} />
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.note} maxFontSizeMultiplier={1.5}>
        All five pieces used, each exactly once.
      </Text>

      <View style={styles.statsRow}>
        {took && <Stat label="Time" value={took} />}
        <Stat label="Forges" value={String(play.forges)} />
        <Stat label="Undos" value={String(play.undos)} />
      </View>

      {children}

      <View style={styles.buttons}>
        <Button title={nextLabel} onPress={onNext} icon="play" testID="next-puzzle" />
        {onHome && <Button title="Home" onPress={onHome} kind="ghost" icon="home" />}
      </View>

      {showAd && <AdSlot placement="results" solvedCount={solvedCount} />}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statValue} maxFontSizeMultiplier={1.4}>
        {value}
      </Text>
      <Text style={styles.statLabel} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', padding: space.lg, gap: space.md, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontFamily: fonts.black, fontSize: 30, color: palette.chalk },
  proofCard: {
    alignSelf: 'stretch',
    backgroundColor: palette.ceramic,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: palette.brass,
    padding: space.lg,
    alignItems: 'center',
  },
  proofResult: { fontFamily: fonts.black, fontSize: 30, color: palette.brassDeep, marginTop: 2, fontVariant: ['tabular-nums'] },
  proofLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 2, color: palette.brassDeep, marginBottom: space.xs },
  proof: { fontFamily: fonts.bold, fontSize: 26, color: palette.graphite, textAlign: 'center', fontVariant: ['tabular-nums'] },
  checklist: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  checkItem: { alignItems: 'center' },
  tick: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.brass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { fontFamily: fonts.regular, fontSize: 14, color: palette.mist },
  statsRow: { flexDirection: 'row', gap: space.xl, marginVertical: space.xs },
  stat: { alignItems: 'center' },
  statValue: { fontFamily: fonts.bold, fontSize: 20, color: palette.chalk, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: palette.mist },
  buttons: { alignSelf: 'stretch', gap: space.sm, marginTop: space.sm },
});
