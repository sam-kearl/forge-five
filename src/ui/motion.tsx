import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { motion, palette } from './theme';

/** Scale-and-fade in on mount. Instant when motion is reduced. */
export function PopIn({ children, reduce, style }: { children: ReactNode; reduce: boolean; style?: StyleProp<ViewStyle> }) {
  const v = useState(() => new Animated.Value(reduce ? 1 : 0))[0];
  useEffect(() => {
    if (reduce) return;
    Animated.timing(v, { toValue: 1, duration: motion.quick, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start();
  }, [reduce, v]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/**
 * Horizontal "cooling" shake used for invalid actions. Small amplitude, three
 * short swings (no flashing). Returns an Animated style and a trigger.
 */
export function useShake(reduce: boolean) {
  const x = useState(() => new Animated.Value(0))[0];
  const shake = () => {
    if (reduce) return;
    x.setValue(0);
    Animated.sequence([
      Animated.timing(x, { toValue: 6, duration: 45, useNativeDriver: true }),
      Animated.timing(x, { toValue: -5, duration: 60, useNativeDriver: true }),
      Animated.timing(x, { toValue: 3, duration: 50, useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };
  return { style: { transform: [{ translateX: x }] }, shake };
}

const SPARKS = 8;

/**
 * The forge burst: an expanding flux ring and a few sparks flying outward,
 * over in ~320 ms. With reduced motion it becomes a brief brass glow.
 */
export function ForgeBurst({ trigger, reduce }: { trigger: number; reduce: boolean }) {
  const t = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    if (trigger === 0) return;
    t.setValue(0);
    Animated.timing(t, {
      toValue: 1,
      duration: reduce ? 260 : motion.forge,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [trigger, reduce, t]);

  const opacity = t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.9, 0] });
  if (reduce) {
    return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glow, { opacity }]} />;
  }
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      <Animated.View
        style={[styles.ring, { opacity, transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.2] }) }] }]}
      />
      {Array.from({ length: SPARKS }, (_, i) => {
        const angle = (i / SPARKS) * Math.PI * 2 + 0.3;
        const dist = 70 + (i % 3) * 18;
        return (
          <Animated.View
            key={i}
            style={[
              styles.spark,
              {
                opacity,
                transform: [
                  { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * dist] }) },
                  { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * dist] }) },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  ring: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: palette.flux },
  spark: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: palette.ember },
  glow: { backgroundColor: palette.brass, borderRadius: 16 },
});
