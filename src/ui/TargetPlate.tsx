import { useId } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { fonts, palette, radius } from './theme';

/**
 * The target, cast into a riveted iron plate lit from below by the forge,
 * with the number glowing like hot metal.
 */
export function TargetPlate({ target, width, scale = 1, compact }: { target: number; width: number; scale?: number; compact?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  // Compact (the tutorial, where the coach bubble needs room) is a little smaller; otherwise the number is 64 pt on phones.
  const h = Math.round((compact ? 76 : 92) * scale);
  const numSize = Math.round((compact ? 52 : 64) * scale);
  const rivets = [
    [16, 16],
    [width - 16, 16],
    [16, h - 16],
    [width - 16, h - 16],
  ];

  return (
    <View style={[styles.plate, { width, height: h }]} accessible accessibilityRole="header" accessibilityLabel={`Target: ${target}`}>
      <Svg width={width} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`iron${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.plateTop} />
            <Stop offset="1" stopColor={palette.plateBottom} />
          </LinearGradient>
          <LinearGradient id={`heat${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.55" stopColor="#FF5A14" stopOpacity={0} />
            <Stop offset="1" stopColor="#FF5A14" stopOpacity={0.14} />
          </LinearGradient>
          {/* The number's heat glow, drawn here because iOS clips text shadows to the text box. */}
          <RadialGradient id={`glow${uid}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#FF8C28" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#FF8C28" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`rivet${uid}`} cx="0.35" cy="0.35" r="0.65">
            <Stop offset="0" stopColor={palette.rivet} />
            <Stop offset="1" stopColor="#241B15" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={h} fill={`url(#iron${uid})`} />
        <Rect x={0} y={0} width={width} height={h} fill={`url(#heat${uid})`} />
        <Rect
          x={width / 2 - numSize * 1.4}
          y={h * 0.62 - numSize * 0.7}
          width={numSize * 2.8}
          height={numSize * 1.4}
          fill={`url(#glow${uid})`}
        />
        {rivets.map(([cx, cy], i) => (
          <Circle key={i} cx={cx} cy={cy} r={4} fill={`url(#rivet${uid})`} />
        ))}
      </Svg>
      <Text style={[styles.label, { fontSize: Math.round(13 * scale) }]} maxFontSizeMultiplier={1.2} importantForAccessibility="no">
        STRIKE THIS NUMBER
      </Text>
      <Text
        allowFontScaling={false}
        style={[styles.number, { fontSize: numSize, lineHeight: Math.round(numSize * 1.05) }]}
        importantForAccessibility="no"
      >
        {target}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    borderRadius: radius.lg + 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  label: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 4, color: palette.blueprintLine },
  number: {
    fontFamily: fonts.black,
    color: '#FFC062',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    // A soft text glow on the web; native relies on the plate's glow (iOS clips text shadows).
    ...Platform.select({ web: { textShadow: '0 0 16px rgba(255,140,40,0.6)' }, default: {} }),
  },
});
