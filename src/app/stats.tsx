import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OP_SYMBOL, OP_WORD, type Op } from '../engine';
import { useApp } from '../state/AppContext';
import { averageSolveMs, favouriteTool, localDay, visibleStreak } from '../state/model';
import { Screen } from '../ui/Screen';
import { fonts, palette, radius, space } from '../ui/theme';

function fmtTime(ms: number | null): string {
  if (ms === null) return '—';
  const s = Math.max(1, Math.round(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function Stats() {
  const { stats } = useApp();
  const [today] = useState(() => localDay(Date.now()));
  const streak = visibleStreak(stats, today);
  const fav = favouriteTool(stats);
  const maxUse = Math.max(1, ...Object.values(stats.toolUse));

  return (
    <Screen title="Your workshop">
      <Text style={styles.note}>Kept only on this device.</Text>
      <View style={styles.grid}>
        <Tile label="Puzzles solved" value={String(stats.solved)} accent />
        <Tile label="Day streak" value={String(streak)} />
        <Tile label="Best streak" value={String(stats.bestDayStreak)} />
        <Tile label="Fastest solve" value={fmtTime(stats.fastestMs)} />
        <Tile label="Average solve" value={fmtTime(averageSolveMs(stats))} />
        <Tile label="Pieces forged" value={String(stats.forges)} />
      </View>

      <Text style={styles.heading} accessibilityRole="header">
        Toolbox
      </Text>
      <Text style={styles.note}>How many of your solutions used each tool.</Text>
      <View style={styles.tools}>
        {(Object.keys(stats.toolUse) as Op[]).map((op) => (
          <View key={op} style={styles.toolRow} accessible accessibilityLabel={`${OP_WORD[op]}: used in ${stats.toolUse[op]} solutions`}>
            <Text style={styles.toolSym}>{OP_SYMBOL[op]}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { width: `${(100 * stats.toolUse[op]) / maxUse}%` }, op === fav && styles.barFav]} />
            </View>
            <Text style={styles.toolCount}>{stats.toolUse[op]}</Text>
          </View>
        ))}
      </View>
      {fav && <Text style={styles.fav}>Favourite tool: {OP_SYMBOL[fav]}</Text>}

      <View style={styles.footer}>
        <Text style={styles.small}>
          Dealt {stats.dealt} · Moved on from {stats.skipped} · Solved with a forge {stats.solvesWithForge}
        </Text>
      </View>
    </Screen>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.tileValue, accent && { color: palette.brass }]} maxFontSizeMultiplier={1.4}>
        {value}
      </Text>
      <Text style={styles.tileLabel} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: fonts.regular, fontSize: 13, color: palette.mist, marginBottom: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { flexBasis: '31%', flexGrow: 1, minWidth: 100, backgroundColor: palette.steel, borderRadius: radius.lg, padding: space.md },
  tileValue: { fontFamily: fonts.bold, fontSize: 24, color: palette.chalk, fontVariant: ['tabular-nums'] },
  tileLabel: { fontFamily: fonts.regular, fontSize: 12, color: palette.mist, marginTop: 2 },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: palette.chalk, marginTop: space.xl },
  tools: { gap: space.sm },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  toolSym: { fontFamily: fonts.bold, fontSize: 24, color: palette.chalk, width: 28, textAlign: 'center' },
  barTrack: { flex: 1, height: 14, borderRadius: 7, backgroundColor: palette.steel, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: palette.coolant, borderRadius: 7 },
  barFav: { backgroundColor: palette.ember },
  toolCount: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: palette.chalk,
    width: 36,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  fav: { fontFamily: fonts.medium, fontSize: 14, color: palette.ember, marginTop: space.sm },
  footer: { marginTop: space.xl },
  small: { fontFamily: fonts.regular, fontSize: 12, color: palette.mist },
});
