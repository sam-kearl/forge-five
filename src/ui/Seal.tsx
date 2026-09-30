import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { fonts, motion, palette } from './theme';

/** A round brass seal that stamps down onto the proof when the puzzle is solved. */
export function Seal({ reduce, size = 112 }: { reduce: boolean; size?: number }) {
  const t = useState(() => new Animated.Value(reduce ? 1 : 0))[0];
  useEffect(() => {
    if (reduce) return;
    Animated.timing(t, { toValue: 1, duration: motion.stamp, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }).start();
  }, [reduce, t]);

  const teeth = 20;
  const r1 = size / 2 - 2;
  const r2 = r1 - 6;
  let d = '';
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? r1 : r2;
    d += `${i === 0 ? 'M' : 'L'}${size / 2 + Math.cos(a) * r} ${size / 2 + Math.sin(a) * r} `;
  }
  d += 'Z';

  return (
    <Animated.View
      accessible={false}
      style={{
        width: size,
        height: size,
        opacity: t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
        transform: [
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1.7, 1] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['-24deg', '-10deg'] }) },
        ],
      }}
    >
      <Svg width={size} height={size}>
        <Path d={d} fill={palette.brass} stroke={palette.brassDeep} strokeWidth={2} />
        <Circle cx={size / 2} cy={size / 2} r={r2 - 8} fill="none" stroke={palette.brassDeep} strokeWidth={2} strokeDasharray="3,3" />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text allowFontScaling={false} style={[styles.word, { fontSize: size * 0.15 }]}>
          FORGED
        </Text>
        <Text allowFontScaling={false} style={[styles.five, { fontSize: size * 0.1 }]}>
          ✦ 5 ✦
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  word: { fontFamily: fonts.black, color: palette.brassInk, letterSpacing: 1.5 },
  five: { fontFamily: fonts.bold, color: palette.brassDeep, marginTop: 1 },
});
