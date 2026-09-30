import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../ui/Screen';
import { fonts, palette, space } from '../ui/theme';

/**
 * Plain-language privacy summary shown in the app. The formal privacy policy
 * is a separate document that must be reviewed by a qualified professional
 * before publication (docs/PRIVACY_POLICY_OUTLINE.md).
 */
const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'What Forge Five keeps',
    body: 'Your settings, the puzzle you are working on, your statistics and whether you have removed ads. All of it is stored only on this device.',
  },
  {
    title: 'What Forge Five never asks for',
    body: 'No accounts, names, email addresses, birthdays, contacts, photos, camera, microphone or location. There is no chat and nothing is shared publicly.',
  },
  {
    title: 'Tracking',
    body: 'Forge Five does not track you across apps or websites, does not build a profile of you, and does not sell data.',
  },
  {
    title: 'Advertising',
    body: 'If ads are shown, they are non-personalised and chosen for a general audience, never based on what you do. They never appear while you are building an equation. A parent can remove them with a one-time purchase.',
  },
  {
    title: 'Purchases',
    body: 'Purchases are handled by the App Store or Google Play. Forge Five never sees payment details.',
  },
  {
    title: 'Removing your data',
    body: 'Reset statistics in Settings, or delete the app to remove everything it stored.',
  },
];

export default function Privacy() {
  return (
    <Screen title="Privacy">
      {SECTIONS.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text style={styles.heading} accessibilityRole="header">
            {s.title}
          </Text>
          <Text style={styles.body}>{s.body}</Text>
        </View>
      ))}
      <Text style={styles.draft}>Summary for families. The full privacy policy will be published with the app.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.lg, gap: space.xs },
  heading: { fontFamily: fonts.bold, fontSize: 17, color: palette.chalk },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: palette.mist },
  draft: { fontFamily: fonts.regular, fontSize: 12, color: palette.mist, marginTop: space.xl },
});
