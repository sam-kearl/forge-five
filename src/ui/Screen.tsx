import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../state/AppContext';
import { Tap } from './controls';
import { ForgeBackdrop } from './ForgeBackdrop';
import { Icon } from './Icon';
import { fonts, palette, space } from './theme';

export function Screen({
  title,
  children,
  scroll = true,
  right,
  onBack,
  maxWidth = 640,
}: {
  title?: string;
  children: ReactNode;
  scroll?: boolean;
  right?: ReactNode;
  onBack?: () => void;
  maxWidth?: number;
}) {
  const { reduceMotion } = useApp();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  const body = <View style={[styles.body, { maxWidth }]}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <ForgeBackdrop reduce={reduceMotion} />
      {title !== undefined && (
        <View style={styles.header}>
          <Tap onPress={back} accessibilityLabel="Back" style={styles.headerBtn}>
            <View style={styles.center}>
              <Icon name="left" color={palette.chalk} />
            </View>
          </Tap>
          <Text style={styles.title} accessibilityRole="header" numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {title}
          </Text>
          <View style={styles.headerRight}>{right}</View>
        </View>
      )}
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{body}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.ink },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, minHeight: 52 },
  headerBtn: { borderRadius: 24 },
  headerRight: { minWidth: 48, alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.display, fontSize: 20, letterSpacing: 2, color: palette.chalk },
  scroll: { flexGrow: 1, paddingBottom: space.xxl },
  body: { width: '100%', alignSelf: 'center', paddingHorizontal: space.lg, flexGrow: 1 },
});
