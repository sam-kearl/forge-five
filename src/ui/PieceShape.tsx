import { memo, useId } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { usePulse } from './motion';
import { fonts, palette } from './theme';

export type PieceLook = 'source' | 'forged' | 'socket';

interface Props {
  label: string;
  look: PieceLook;
  width: number;
  selected?: boolean;
  /** Warm glow while being dealt or forged. */
  hot?: boolean;
  /** Forged pieces only: let the molten glow throb (callers pass false under reduced motion). */
  pulse?: boolean;
}

/** A hexagon fitted to the box (x0, y0)–(x1, y1), flat top and bottom. */
function hex(x0: number, y0: number, x1: number, y1: number) {
  const w = x1 - x0;
  const midY = (y0 + y1) / 2;
  return [
    [x0 + 0.25 * w, y0],
    [x0 + 0.75 * w, y0],
    [x1, midY],
    [x0 + 0.75 * w, y1],
    [x0 + 0.25 * w, y1],
    [x0, midY],
  ]
    .map((p) => p.join(','))
    .join(' ');
}

/**
 * A number piece: a cast-iron hexagon with a hot orange rim. Forged pieces are
 * molten amber with a glow that slowly throbs; used pieces leave a dark empty
 * socket. Selection adds an ember outline *and* corner ticks so it never relies
 * on colour alone.
 */
function PieceShapeImpl({ label, look, width, selected, hot, pulse }: Props) {
  // Gradient ids must be unique per piece: Safari mis-resolves duplicated ids when a piece re-renders.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const rimId = `rim${uid}`;
  const coreId = `core${uid}`;
  const w = width;
  const h = Math.round(w * 0.88);
  const edge = 1.5;
  const rim = Math.max(2.5, w * 0.05);
  const outer = hex(edge, edge, w - edge, h - edge);
  const inner = hex(edge + rim, edge + rim * 0.9, w - edge - rim, h - edge - rim * 0.9);

  const textColor = look === 'forged' ? '#3A1804' : look === 'socket' ? '#5A4A3E' : palette.chalk;
  const digits = label.length;
  const fontSize = Math.round(w * (digits >= 3 ? 0.38 : digits === 2 ? 0.44 : 0.48));
  const outline = selected ? palette.ember : hot ? palette.flux : null;

  return (
    <View style={{ width: w, height: h }}>
      {look === 'forged' && <MoltenGlow width={w} height={h} pulse={!!pulse} />}
      {/* Keyed by look so the SVG is rebuilt (not patched) when a piece changes state. */}
      <Svg key={look} width={w} height={h}>
        <Defs>
          {look === 'forged' ? (
            <>
              <LinearGradient id={rimId} x1="0.2" y1="0" x2="0.8" y2="1">
                <Stop offset="0" stopColor="#FFD58A" />
                <Stop offset="1" stopColor="#C2621A" />
              </LinearGradient>
              <RadialGradient id={coreId} cx="0.4" cy="0.3" r="0.75">
                <Stop offset="0" stopColor="#FFF1C8" />
                <Stop offset="0.32" stopColor="#FFC25A" />
                <Stop offset="0.62" stopColor="#F08C24" />
                <Stop offset="1" stopColor="#9A4410" />
              </RadialGradient>
            </>
          ) : (
            <>
              <LinearGradient id={rimId} x1="0.25" y1="0" x2="0.75" y2="1">
                <Stop offset="0" stopColor="#FF9A3A" />
                <Stop offset="0.6" stopColor="#B83A10" />
                <Stop offset="1" stopColor="#5A1A06" />
              </LinearGradient>
              <LinearGradient id={coreId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#34291F" />
                <Stop offset="1" stopColor="#16100C" />
              </LinearGradient>
            </>
          )}
        </Defs>
        {look === 'socket' ? (
          <>
            <Polygon points={outer} fill="rgba(255,255,255,0.08)" />
            <Polygon points={inner} fill="#0D0907" />
          </>
        ) : (
          <>
            <Polygon points={outer} fill={`url(#${rimId})`} />
            <Polygon points={inner} fill={`url(#${coreId})`} />
          </>
        )}
        {outline && <Polygon points={outer} fill="none" stroke={outline} strokeWidth={3} strokeLinejoin="round" />}
        {selected &&
          [
            [0.25 * w, 1],
            [0.75 * w, 1],
            [0.25 * w, h - 1],
            [0.75 * w, h - 1],
          ].map(([cx, cy], i) => <Circle key={`s${i}`} cx={cx} cy={cy} r={3.5} fill={palette.ember} />)}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center, styles.noTouch]}>
        <Text allowFontScaling={false} style={[styles.num, { fontSize, lineHeight: Math.round(fontSize * 1.1), color: textColor }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

/** The heat haze around a forged piece. It throbs when `pulse` is set and holds steady otherwise. */
function MoltenGlow({ width, height, pulse }: { width: number; height: number; pulse: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const t = usePulse(!pulse, 2400);
  const gw = width * 1.7;
  const gh = height * 1.7;
  const opacity = pulse ? t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1, 0.5] }) : 0.7;
  return (
    <Animated.View style={[styles.glow, { width: gw, height: gh, left: (width - gw) / 2, top: (height - gh) / 2, opacity }]}>
      <Svg width={gw} height={gh}>
        <Defs>
          <RadialGradient id={`glow${uid}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0.35" stopColor="#FFAA3C" stopOpacity={0.75} />
            <Stop offset="1" stopColor="#FF8C28" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={gw} height={gh} fill={`url(#glow${uid})`} />
      </Svg>
    </Animated.View>
  );
}

export const PieceShape = memo(PieceShapeImpl);

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  num: { fontFamily: fonts.black, fontVariant: ['tabular-nums'], includeFontPadding: false },
  glow: { position: 'absolute', pointerEvents: 'none' },
  noTouch: { pointerEvents: 'none' },
});
