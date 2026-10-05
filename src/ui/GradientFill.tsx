import { useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * A top-to-bottom gradient filling its parent (put it first inside a View with
 * `overflow: 'hidden'` and a border radius). Stops are [offset, colour] pairs.
 * The SVG is sized in measured points: percentage sizes leave gaps on iOS.
 * Until the first layout the parent's own background colour shows.
 */
export function GradientFill({ stops }: { stops: readonly (readonly [number, string])[] }) {
  // Unique ids: Safari mis-resolves gradients that share an id.
  const id = `fill${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  return (
    <View
      style={styles.fill}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        setSize((old) => (old && old.w === w && old.h === h ? old : { w, h }));
      }}
    >
      {size && (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              {stops.map(([offset, color]) => (
                <Stop key={offset} offset={String(offset)} stopColor={color} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size.w} height={size.h} fill={`url(#${id})`} />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' } });

/** Shared gradients. */
export const GRADIENTS = {
  iron: [
    [0, '#2B221C'],
    [1, '#191310'],
  ],
  ironLow: [
    [0, '#221B16'],
    [1, '#15100D'],
  ],
  plate: [
    [0, '#221A15'],
    [1, '#130E0B'],
  ],
  bench: [
    [0, '#1E1712'],
    [1, '#120D0A'],
  ],
  danger: [
    [0, '#B3261A'],
    [1, '#7A160E'],
  ],
  molten: [
    [0, '#FFD889'],
    [0.5, '#F7A93C'],
    [1, '#C9661A'],
  ],
} as const;
