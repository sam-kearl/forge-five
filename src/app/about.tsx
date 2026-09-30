import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';
import { Logo } from '../ui/Logo';
import { Screen } from '../ui/Screen';
import { fonts, palette, space } from '../ui/theme';

const CREDITS: { name: string; detail: string }[] = [
  { name: 'Lexend typeface', detail: 'By Bonnie Shaver-Troup, Thomas Jockin and others. SIL Open Font License 1.1.' },
  { name: 'Sound effects', detail: 'Original, synthesised for Forge Five.' },
  { name: 'Illustrations & icons', detail: 'Original, drawn in code for Forge Five.' },
  { name: 'Open-source software', detail: 'React Native, Expo and other libraries under their respective licences (MIT and similar).' },
];

export default function About() {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return (
    <Screen title="About">
      <View style={styles.hero}>
        <Logo size={96} />
        <Text style={styles.version}>Version {version}</Text>
      </View>
      {CREDITS.map((c) => (
        <View key={c.name} style={styles.item}>
          <Text style={styles.name}>{c.name}</Text>
          <Text style={styles.detail}>{c.detail}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginVertical: space.lg },
  version: { fontFamily: fonts.regular, fontSize: 13, color: palette.mist, marginTop: space.sm },
  item: { marginTop: space.md },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: palette.chalk },
  detail: { fontFamily: fonts.regular, fontSize: 14, color: palette.mist, lineHeight: 20 },
});
