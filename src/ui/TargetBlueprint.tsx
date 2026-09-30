import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { fonts, palette, radius } from './theme';

/**
 * The target, drawn as a small blueprint spec sheet: grid paper, a
 * dimension line with arrowheads, and a spec label.
 */
export function TargetBlueprint({ target, width, compact }: { target: number; width: number; compact?: boolean }) {
  const h = compact ? 84 : 112;
  const grid = 14;
  const lines: ReactElement[] = [];
  for (let x = grid; x < width; x += grid)
    lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={h} stroke={palette.blueprintLine} strokeOpacity={0.14} strokeWidth={1} />);
  for (let y = grid; y < h; y += grid)
    lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke={palette.blueprintLine} strokeOpacity={0.14} strokeWidth={1} />);
  const dimY = h - 14;
  const numSize = compact ? 40 : 54;

  return (
    <View style={[styles.card, { width, height: h }]} accessible accessibilityRole="header" accessibilityLabel={`Target: ${target}`}>
      <Svg width={width} height={h} style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={width} height={h} fill={palette.blueprint} />
        {lines}
        <Rect
          x={5}
          y={5}
          width={width - 10}
          height={h - 10}
          fill="none"
          stroke={palette.blueprintLine}
          strokeOpacity={0.55}
          strokeWidth={1}
          strokeDasharray="2,4"
        />
        {/* dimension line */}
        <Line x1={width * 0.3} y1={dimY} x2={width * 0.7} y2={dimY} stroke={palette.blueprintLine} strokeWidth={1.2} />
        <Path d={`M${width * 0.3} ${dimY} l7 -4 v8 z`} fill={palette.blueprintLine} />
        <Path d={`M${width * 0.7} ${dimY} l-7 -4 v8 z`} fill={palette.blueprintLine} />
        <Line x1={width * 0.3} y1={dimY - 8} x2={width * 0.3} y2={dimY + 5} stroke={palette.blueprintLine} strokeWidth={1.2} />
        <Line x1={width * 0.7} y1={dimY - 8} x2={width * 0.7} y2={dimY + 5} stroke={palette.blueprintLine} strokeWidth={1.2} />
      </Svg>
      <View style={styles.labelRow} importantForAccessibility="no-hide-descendants">
        <Text style={styles.label} maxFontSizeMultiplier={1.3}>
          SPEC
        </Text>
        <Text style={styles.label} maxFontSizeMultiplier={1.3}>
          TARGET
        </Text>
      </View>
      <Text
        allowFontScaling={false}
        style={[styles.number, { fontSize: numSize, marginTop: compact ? -6 : -2 }]}
        importantForAccessibility="no"
      >
        {target}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: palette.blueprintLine,
  },
  labelRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  label: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 2, color: palette.blueprintLine },
  number: { fontFamily: fonts.black, color: palette.chalk, fontVariant: ['tabular-nums'], includeFontPadding: false },
});
