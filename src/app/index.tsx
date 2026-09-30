import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AdSlot } from '../features/ads/AdSlot';
import { useApp } from '../state/AppContext';
import { localDay, visibleStreak } from '../state/model';
import { Button, Tap } from '../ui/controls';
import { Icon, type IconName } from '../ui/Icon';
import { Logo } from '../ui/Logo';
import { Screen } from '../ui/Screen';
import { fonts, palette, radius, space } from '../ui/theme';

export default function Home() {
  const { stats, tutorialCompleted } = useApp();
  const [today] = useState(() => localDay(Date.now()));
  const streak = visibleStreak(stats, today);

  return (
    <Screen maxWidth={520}>
      <View style={styles.hero}>
        <Logo size={150} />
        <Text style={styles.tagline} maxFontSizeMultiplier={1.4}>
          Five numbers. One target. Forge the answer.
        </Text>
      </View>

      <View style={styles.actions}>
        {tutorialCompleted ? (
          <>
            <Button
              title={stats.dealt > 0 ? 'Play' : 'Start forging'}
              icon="play"
              onPress={() => router.push('/play')}
              testID="home-play"
            />
            <Button title="How to play" icon="help" kind="secondary" onPress={() => router.push('/tutorial')} />
          </>
        ) : (
          <>
            <Button
              title="Learn in a minute"
              icon="help"
              onPress={() => router.push('/tutorial')}
              accessibilityHint="A short hands-on walkthrough"
              testID="home-tutorial"
            />
            <Button title="Jump straight in" icon="play" kind="secondary" onPress={() => router.push('/play')} testID="home-play" />
          </>
        )}
      </View>

      {stats.solved > 0 && (
        <View
          style={styles.summary}
          accessible
          accessibilityLabel={`${stats.solved} puzzles solved${streak > 1 ? `, ${streak} day streak` : ''}`}
        >
          <Text style={styles.summaryText}>
            <Text style={styles.summaryNum}>{stats.solved}</Text> solved
            {streak > 1 ? (
              <>
                {'   ·   '}
                <Text style={styles.summaryNum}>{streak}</Text>-day streak
              </>
            ) : null}
          </Text>
        </View>
      )}

      <View style={styles.nav}>
        <NavTile icon="chart" label="Stats" onPress={() => router.push('/stats')} />
        <NavTile icon="gear" label="Settings" onPress={() => router.push('/settings')} />
        <NavTile icon="lock" label="Parents" onPress={() => router.push('/parents')} />
      </View>

      <AdSlot placement="home" solvedCount={stats.solved} />
    </Screen>
  );
}

function NavTile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Tap onPress={onPress} accessibilityLabel={label} style={styles.tile}>
      <View style={styles.tileInner}>
        <Icon name={icon} color={palette.coolant} size={24} />
        <Text style={styles.tileText} maxFontSizeMultiplier={1.4}>
          {label}
        </Text>
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: space.xxl, marginBottom: space.xl },
  tagline: { fontFamily: fonts.medium, fontSize: 16, color: palette.mist, marginTop: space.sm, textAlign: 'center' },
  actions: { gap: space.md },
  summary: { alignItems: 'center', marginTop: space.lg },
  summaryText: { fontFamily: fonts.regular, fontSize: 15, color: palette.mist },
  summaryNum: { fontFamily: fonts.bold, color: palette.brass },
  nav: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  tile: { flex: 1, borderRadius: radius.lg, backgroundColor: palette.steel, borderWidth: 1, borderColor: palette.steelLine, minHeight: 84 },
  tileInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xs, paddingVertical: space.md },
  tileText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.chalk },
});
