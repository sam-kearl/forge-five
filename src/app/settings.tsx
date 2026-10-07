import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { timerShown, type MotionPreference } from '../state/model';
import { Button, SectionLabel, Tap } from '../ui/controls';
import { Screen } from '../ui/Screen';
import { fonts, palette, radius, space } from '../ui/theme';

const MOTION_OPTIONS: { value: MotionPreference; label: string }[] = [
  { value: 'system', label: 'Match device' },
  { value: 'reduced', label: 'Reduced' },
  { value: 'full', label: 'Full' },
];

export default function Settings() {
  const { settings, updateSettings, cue, resetStats, setTutorialCompleted } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  return (
    <Screen title="Settings">
      <View style={styles.section}>
        <SectionLabel>Sound & feel</SectionLabel>
        <ToggleRow
          label="Sound effects"
          value={settings.sound}
          onChange={(v) => {
            updateSettings({ sound: v });
            if (v) setTimeout(() => cue('tap'), 50);
          }}
        />
        <ToggleRow
          label="Vibration (haptics)"
          value={settings.haptics}
          onChange={(v) => {
            updateSettings({ haptics: v });
            if (v) setTimeout(() => cue(undefined, 'select'), 50);
          }}
        />
      </View>

      <View style={styles.section}>
        <SectionLabel>Play</SectionLabel>
        <ToggleRow label="Show timer" value={timerShown(settings)} onChange={(v) => updateSettings({ showTimer: v })} />
        <Text style={styles.help}>Hides the clock above the target. Your solve times are still recorded in Stats.</Text>
      </View>

      <View style={styles.section}>
        <SectionLabel>Motion</SectionLabel>
        <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel="Animation amount">
          {MOTION_OPTIONS.map((o) => {
            const on = settings.motion === o.value;
            return (
              <Tap
                key={o.value}
                onPress={() => updateSettings({ motion: o.value })}
                accessibilityLabel={o.label}
                selected={on}
                style={[styles.segItem, on && styles.segOn]}
              >
                <View style={styles.center}>
                  <Text style={[styles.segText, on && styles.segTextOn]}>{o.label}</Text>
                </View>
              </Tap>
            );
          })}
        </View>
        <Text style={styles.help}>Reduced motion replaces sparks, stamps and slides with quick fades.</Text>
      </View>

      <View style={styles.section}>
        <SectionLabel>Learn</SectionLabel>
        <Button
          title="Replay the tutorial"
          kind="secondary"
          icon="help"
          onPress={() => {
            setTutorialCompleted(false);
            router.push('/tutorial');
          }}
        />
      </View>

      <View style={styles.section}>
        <SectionLabel>Grown-ups</SectionLabel>
        <Button title="Parents: remove ads & restore" kind="secondary" icon="lock" onPress={() => router.push('/parents')} />
        <Button title="Privacy" kind="ghost" onPress={() => router.push('/privacy')} />
        <Button title="About & credits" kind="ghost" onPress={() => router.push('/about')} />
      </View>

      <View style={styles.section}>
        <SectionLabel>Data</SectionLabel>
        <Button
          title={resetDone ? 'Statistics reset' : confirmReset ? 'Tap again to erase statistics' : 'Reset statistics'}
          kind="ghost"
          disabled={resetDone}
          onPress={() => {
            if (!confirmReset) {
              setConfirmReset(true);
              return;
            }
            resetStats();
            setConfirmReset(false);
            setResetDone(true);
          }}
        />
      </View>
    </Screen>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel} maxFontSizeMultiplier={1.6}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: palette.coolantDeep, false: palette.steelLine }}
        thumbColor={value ? palette.coolant : palette.mist}
        {...({ activeThumbColor: palette.coolant } as object)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm, marginTop: space.lg },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.steel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: space.lg,
  },
  rowLabel: { fontFamily: fonts.medium, fontSize: 16, color: palette.chalk, flexShrink: 1 },
  segment: { flexDirection: 'row', backgroundColor: palette.steel, borderRadius: radius.md, padding: 4, gap: 4 },
  segItem: { flex: 1, borderRadius: radius.sm },
  segOn: { backgroundColor: palette.ember },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: fonts.semibold, fontSize: 14, color: palette.chalk },
  segTextOn: { color: palette.brassInk },
  help: { fontFamily: fonts.regular, fontSize: 13, color: palette.mist },
});
