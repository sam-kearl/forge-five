import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';
import { fonts, palette } from './theme';

/**
 * Forge Five mark: five hex components meeting at a glowing assembly point,
 * above the wordmark. Original artwork drawn in code.
 */
export function Logo({ size = 140 }: { size?: number }) {
  const c = size / 2;
  const R = size * 0.34;
  const hexW = size * 0.26;
  const hex = (cx: number, cy: number) => {
    const w = hexW;
    const h = w * 0.88;
    return [
      [cx - w / 4, cy - h / 2],
      [cx + w / 4, cy - h / 2],
      [cx + w / 2, cy],
      [cx + w / 4, cy + h / 2],
      [cx - w / 4, cy + h / 2],
      [cx - w / 2, cy],
    ]
      .map((p) => p.join(','))
      .join(' ');
  };
  const centers = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return [c + Math.cos(a) * R, c + Math.sin(a) * R] as const;
  });
  return (
    <View style={styles.wrap} accessible accessibilityRole="header" accessibilityLabel="Forge Five">
      <Svg width={size} height={size}>
        {centers.map(([x, y], i) => (
          <Line
            key={`l${i}`}
            x1={x}
            y1={y}
            x2={c}
            y2={c}
            stroke={palette.blueprintLine}
            strokeOpacity={0.6}
            strokeWidth={2}
            strokeDasharray="3,4"
          />
        ))}
        <Circle cx={c} cy={c} r={size * 0.12} fill={palette.flux} opacity={0.25} />
        <Circle cx={c} cy={c} r={size * 0.075} fill={palette.ember} />
        {centers.map(([x, y], i) => (
          <Polygon
            key={i}
            points={hex(x, y)}
            fill={i === 0 ? palette.brass : palette.ceramic}
            stroke={i === 0 ? palette.brassDeep : palette.coolant}
            strokeWidth={3}
            strokeLinejoin="round"
          />
        ))}
      </Svg>
      <Text style={styles.word} allowFontScaling={false}>
        FORGE <Text style={styles.five}>FIVE</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  word: { fontFamily: fonts.black, fontSize: 34, letterSpacing: 3, color: palette.chalk, marginTop: 4 },
  five: { color: palette.ember },
});
