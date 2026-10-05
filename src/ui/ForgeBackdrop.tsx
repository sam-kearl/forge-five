import { useEffect, useId, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { usePulse } from './motion';
import { NATIVE_DRIVER, palette } from './theme';

/** Embers: horizontal position (fraction of width), start height, size, rise time and delay (ms). */
const EMBERS = [
  { x: 0.12, bottom: 120, size: 4, duration: 6000, delay: 0 },
  { x: 0.31, bottom: 60, size: 3, duration: 7500, delay: 1200 },
  { x: 0.54, bottom: 90, size: 5, duration: 5400, delay: 2500 },
  { x: 0.77, bottom: 140, size: 3, duration: 6800, delay: 600 },
  { x: 0.9, bottom: 70, size: 4, duration: 8000, delay: 3000 },
] as const;

/**
 * The smithy behind every screen: the forge fire glowing up from below, a
 * faint warm light from above, and a few embers drifting upward. With reduced
 * motion the glow holds still and the embers are not drawn.
 */
export function ForgeBackdrop({ reduce }: { reduce: boolean }) {
  const { width, height } = useWindowDimensions();
  const flicker = usePulse(reduce, 3200);
  const glowH = Math.min(560, height * 0.65);
  // Unique gradient ids: screens stay mounted under each other, and Safari mixes up duplicated ids.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View style={styles.root} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={300} style={styles.top}>
        <Defs>
          <RadialGradient id={`forgeTop${uid}`} cx="0.5" cy="0" r="0.75">
            <Stop offset="0" stopColor="#FF8C32" stopOpacity={0.1} />
            <Stop offset="1" stopColor={palette.ink} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={300} fill={`url(#forgeTop${uid})`} />
      </Svg>
      <Animated.View
        style={[
          styles.bottom,
          {
            height: glowH,
            opacity: reduce ? 0.9 : flicker.interpolate({ inputRange: [0, 0.45, 0.7, 1], outputRange: [0.85, 1, 0.75, 0.85] }),
          },
        ]}
      >
        {/* In bounding-box units a circle's radius stretches with the box, so this is a wide ellipse. */}
        <Svg width={width} height={glowH}>
          <Defs>
            <RadialGradient id={`forgeFire${uid}`} cx="0.5" cy="1.05" r="0.62">
              <Stop offset="0" stopColor={palette.fire} stopOpacity={0.55} />
              <Stop offset="0.45" stopColor="#C4280A" stopOpacity={0.26} />
              <Stop offset="1" stopColor={palette.ink} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={glowH} fill={`url(#forgeFire${uid})`} />
        </Svg>
      </Animated.View>
      {!reduce && EMBERS.map((e, i) => <Ember key={i} {...e} left={e.x * width} rise={Math.min(520, height * 0.6)} />)}
    </View>
  );
}

function Ember({
  left,
  bottom,
  size,
  duration,
  delay,
  rise,
}: {
  left: number;
  bottom: number;
  size: number;
  duration: number;
  delay: number;
  rise: number;
}) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: NATIVE_DRIVER }));
    const start = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [t, duration, delay]);
  return (
    <Animated.View
      style={[
        styles.ember,
        {
          left,
          bottom,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -rise] }) },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
  top: { position: 'absolute', top: 0, left: 0 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  ember: { position: 'absolute', backgroundColor: palette.ember, boxShadow: '0 0 8px 2px rgba(255,120,30,0.8)' },
});
