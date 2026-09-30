import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { MockAdService, NoAdService, type AdService } from '../services/ads';
import { createExpoHaptics, createExpoSound } from '../services/expoFeedback';
import type { HapticCue, HapticsService, SoundCue, SoundService } from '../services/feedback';
import {
  applyPurchaseResult,
  applyRestoreResult,
  MockPurchaseService,
  NO_ENTITLEMENTS,
  type Entitlements,
  type PurchaseResult,
  type PurchaseService,
  type RestoreResult,
} from '../services/purchases';
import { loadJson, saveJson, STORAGE_KEYS, type StorageService } from '../services/storage';
import { DEFAULT_SETTINGS, EMPTY_STATS, isSettings, isStats, shouldReduceMotion, type Settings, type Stats } from './model';

export interface Services {
  storage: StorageService;
  ads: AdService;
  purchases: PurchaseService;
  sound: SoundService;
  haptics: HapticsService;
}

/**
 * Service wiring for this build. Swap implementations here only; gameplay code
 * never imports a concrete ad, purchase or storage provider.
 *
 * EXPO_PUBLIC_ADS=mock shows the placeholder ad frame during development.
 */
export function createDefaultServices(): Services {
  return {
    storage: AsyncStorage,
    ads: process.env.EXPO_PUBLIC_ADS === 'mock' ? new MockAdService('fill') : new NoAdService(),
    purchases: new MockPurchaseService({ latencyMs: 600 }),
    sound: createExpoSound(),
    haptics: createExpoHaptics(),
  };
}

interface TutorialState {
  completed: boolean;
}

interface AppState {
  ready: boolean;
  services: Services;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  stats: Stats;
  updateStats: (fn: (s: Stats) => Stats) => void;
  resetStats: () => void;
  entitlements: Entitlements;
  purchaseRemoveAds: (productId: string) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<RestoreResult>;
  tutorialCompleted: boolean;
  setTutorialCompleted: (done: boolean) => void;
  reduceMotion: boolean;
  /** Play a sound and/or haptic, honouring the player's settings. */
  cue: (sound?: SoundCue, haptic?: HapticCue) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children, services: injected }: { children: ReactNode; services?: Services }) {
  const services = useMemo(() => injected ?? createDefaultServices(), [injected]);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [entitlements, setEntitlements] = useState<Entitlements>(NO_ENTITLEMENTS);
  const [tutorial, setTutorial] = useState<TutorialState>({ completed: false });
  const [systemReduced, setSystemReduced] = useState(false);

  // Load everything once. Corrupt or missing data falls back to defaults.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [s, st, e, t] = await Promise.all([
        loadJson(services.storage, STORAGE_KEYS.settings, DEFAULT_SETTINGS, isSettings),
        loadJson(services.storage, STORAGE_KEYS.stats, EMPTY_STATS, isStats),
        loadJson<Entitlements>(
          services.storage,
          STORAGE_KEYS.entitlements,
          NO_ENTITLEMENTS,
          (v): v is Entitlements => typeof (v as Entitlements)?.adFree === 'boolean',
        ),
        loadJson<TutorialState>(services.storage, STORAGE_KEYS.tutorial, { completed: false }),
      ]);
      if (!alive) return;
      setSettings(s);
      setStats(st);
      setEntitlements(e);
      setTutorial(t);
      setReady(true);
      services.ads.initialize().catch(() => {});
    })();
    return () => {
      alive = false;
    };
  }, [services]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setSystemReduced)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduced);
    return () => sub.remove();
  }, []);

  useEffect(() => () => services.sound.dispose(), [services]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) =>
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        saveJson(services.storage, STORAGE_KEYS.settings, next);
        return next;
      }),
    [services],
  );

  const updateStats = useCallback(
    (fn: (s: Stats) => Stats) =>
      setStats((prev) => {
        const next = fn(prev);
        saveJson(services.storage, STORAGE_KEYS.stats, next);
        return next;
      }),
    [services],
  );

  const resetStats = useCallback(() => updateStats(() => EMPTY_STATS), [updateStats]);

  const saveEntitlements = useCallback(
    (fn: (e: Entitlements) => Entitlements) =>
      setEntitlements((prev) => {
        const next = fn(prev);
        if (next !== prev) saveJson(services.storage, STORAGE_KEYS.entitlements, next);
        return next;
      }),
    [services],
  );

  const purchaseRemoveAds = useCallback(
    async (productId: string) => {
      let r: PurchaseResult;
      try {
        r = await services.purchases.purchase(productId);
      } catch (err) {
        r = { status: 'failed', message: err instanceof Error ? err.message : 'Unknown error' };
      }
      saveEntitlements((e) => applyPurchaseResult(e, r, Date.now()));
      return r;
    },
    [services, saveEntitlements],
  );

  const restorePurchases = useCallback(async () => {
    let r: RestoreResult;
    try {
      r = await services.purchases.restore();
    } catch (err) {
      r = { status: 'failed', message: err instanceof Error ? err.message : 'Unknown error' };
    }
    saveEntitlements((e) => applyRestoreResult(e, r, Date.now()));
    return r;
  }, [services, saveEntitlements]);

  const setTutorialCompleted = useCallback(
    (completed: boolean) => {
      const next = { completed };
      setTutorial(next);
      saveJson(services.storage, STORAGE_KEYS.tutorial, next);
    },
    [services],
  );

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const cue = useCallback(
    (sound?: SoundCue, haptic?: HapticCue) => {
      if (sound && settingsRef.current.sound) services.sound.play(sound);
      if (haptic && settingsRef.current.haptics) services.haptics.play(haptic);
    },
    [services],
  );

  const value: AppState = {
    ready,
    services,
    settings,
    updateSettings,
    stats,
    updateStats,
    resetStats,
    entitlements,
    purchaseRemoveAds,
    restorePurchases,
    tutorialCompleted: tutorial.completed,
    setTutorialCompleted,
    reduceMotion: shouldReduceMotion(settings.motion, systemReduced),
    cue,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}
