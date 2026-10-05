import { Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold, useFonts } from '@expo-google-fonts/barlow';
import { BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../state/AppContext';
import { palette } from '../ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Web: stop mobile browsers treating quick successive taps as double-tap-to-zoom,
// which swallows taps on pieces and keys.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = 'html, body { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }';
  document.head.appendChild(style);
}

function Gate() {
  const { ready, reduceMotion } = useApp();
  const [fontsLoaded, fontError] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
  });
  const done = ready && (fontsLoaded || !!fontError);
  useEffect(() => {
    if (done) SplashScreen.hideAsync().catch(() => {});
  }, [done]);
  if (!done) return null;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.ink },
        animation: reduceMotion ? 'none' : 'slide_from_right',
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <Gate />
      </AppProvider>
    </SafeAreaProvider>
  );
}
