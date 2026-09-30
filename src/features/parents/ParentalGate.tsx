import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tap } from '../../ui/controls';
import { fonts, palette, radius, space } from '../../ui/theme';
import { initialGate, pressDigit } from './gate';

/** Adult check shown before purchases, restore and anything that leaves the app. */
export function ParentalGate({ onPass }: { onPass: () => void }) {
  const [gate, setGate] = useState(() => initialGate());
  const [now, setNow] = useState(Date.now());
  const keypad = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, 0], []);
  const locked = gate.lockedUntil !== null && now < gate.lockedUntil;

  useEffect(() => {
    if (gate.passed) onPass();
  }, [gate.passed, onPass]);

  useEffect(() => {
    if (!locked) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [locked]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header">
        For grown-ups
      </Text>
      <Text style={styles.body}>To continue, enter these numbers in order:</Text>
      <Text style={styles.prompt} accessibilityLabel={`Enter: ${gate.challenge.prompt}`}>
        {gate.challenge.prompt.toUpperCase()}
      </Text>
      <View style={styles.dots} accessibilityLabel={`${gate.entered.length} of 3 entered`}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i < gate.entered.length && styles.dotOn]} />
        ))}
      </View>
      {locked ? (
        <Text style={styles.locked} accessibilityLiveRegion="polite">
          Too many tries. Please wait {Math.ceil(((gate.lockedUntil ?? 0) - now) / 1000)} seconds.
        </Text>
      ) : (
        <View style={styles.pad}>
          {keypad.map((d) => (
            <Tap key={d} onPress={() => setGate((g) => pressDigit(g, d, Date.now()))} accessibilityLabel={String(d)} style={styles.key}>
              <View style={styles.keyInner}>
                <Text style={styles.keyText}>{d}</Text>
              </View>
            </Tap>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
  title: { fontFamily: fonts.bold, fontSize: 22, color: palette.chalk },
  body: { fontFamily: fonts.regular, fontSize: 15, color: palette.mist, textAlign: 'center' },
  prompt: { fontFamily: fonts.bold, fontSize: 20, color: palette.ember, letterSpacing: 1, marginVertical: space.sm, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: space.sm, marginBottom: space.sm },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: palette.mist },
  dotOn: { backgroundColor: palette.ember, borderColor: palette.ember },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm, maxWidth: 280 },
  key: { width: 72, height: 56, borderRadius: radius.md, backgroundColor: palette.steelHi, borderWidth: 1, borderColor: palette.steelLine },
  keyInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontFamily: fonts.bold, fontSize: 22, color: palette.chalk },
  locked: { fontFamily: fonts.medium, fontSize: 15, color: palette.quench, textAlign: 'center', marginTop: space.md },
});
