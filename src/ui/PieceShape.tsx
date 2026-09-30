import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';
import { fonts, palette } from './theme';

export type PieceLook = 'source' | 'forged' | 'socket';

interface Props {
  label: string;
  look: PieceLook;
  width: number;
  selected?: boolean;
  /** Warm glow while being dealt or forged. */
  hot?: boolean;
}

/**
 * A number component shaped like a hex nut. Source pieces are ceramic with a
 * coolant rim; forged pieces are brass-plated with rivets; used pieces leave an
 * empty dashed socket. Selection adds a thick ember rim *and* corner ticks so
 * it never relies on colour alone.
 */
function PieceShapeImpl({ label, look, width, selected, hot }: Props) {
  const w = width;
  const h = Math.round(w * 0.88);
  const inset = 3;
  const pts = [
    [0.25 * w, inset],
    [0.75 * w, inset],
    [w - inset, h / 2],
    [0.75 * w, h - inset],
    [0.25 * w, h - inset],
    [inset, h / 2],
  ]
    .map((p) => p.join(','))
    .join(' ');

  const fill = look === 'forged' ? 'url(#brass)' : look === 'socket' ? 'transparent' : 'url(#ceramic)';
  const stroke = selected
    ? palette.ember
    : hot
      ? palette.flux
      : look === 'forged'
        ? palette.brassDeep
        : look === 'socket'
          ? palette.steelLine
          : palette.coolant;
  const strokeWidth = selected ? 5 : look === 'socket' ? 2 : 3.5;
  const textColor = look === 'forged' ? palette.brassInk : look === 'socket' ? palette.steelLine : palette.graphite;
  const digits = label.length;
  const fontSize = Math.round(w * (digits >= 3 ? 0.3 : digits === 2 ? 0.38 : 0.44));

  return (
    <View style={{ width: w, height: h }}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id="ceramic" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.chalk} />
            <Stop offset="1" stopColor={palette.ceramicShade} />
          </LinearGradient>
          <LinearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#F6DC8E" />
            <Stop offset="0.55" stopColor={palette.brass} />
            <Stop offset="1" stopColor="#CF9F45" />
          </LinearGradient>
        </Defs>
        <Polygon
          points={pts}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeDasharray={look === 'socket' ? '5,5' : undefined}
        />
        {look !== 'socket' && (
          <Circle
            cx={w / 2}
            cy={h / 2}
            r={w * 0.31}
            fill="none"
            stroke={look === 'forged' ? '#C99B3E' : palette.ceramicEdge}
            strokeWidth={1.5}
          />
        )}
        {look === 'forged' &&
          [
            [0.27 * w, 0.2 * h],
            [0.73 * w, 0.2 * h],
            [0.5 * w, 0.86 * h],
          ].map(([cx, cy], i) => <Circle key={i} cx={cx} cy={cy} r={Math.max(1.8, w * 0.035)} fill={palette.brassDeep} />)}
        {selected &&
          [
            [0.25 * w, 0],
            [0.75 * w, 0],
            [0.25 * w, h],
            [0.75 * w, h],
          ].map(([cx, cy], i) => <Circle key={`s${i}`} cx={cx} cy={cy} r={3.5} fill={palette.ember} />)}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <Text allowFontScaling={false} style={[styles.num, { fontSize, color: textColor }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export const PieceShape = memo(PieceShapeImpl);

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  num: { fontFamily: fonts.bold, fontVariant: ['tabular-nums'], includeFontPadding: false },
});
