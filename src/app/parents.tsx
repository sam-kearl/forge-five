import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ParentalGate } from '../features/parents/ParentalGate';
import { REMOVE_ADS_PRODUCT_ID, type Product } from '../services/purchases';
import { useApp } from '../state/AppContext';
import { Button } from '../ui/controls';
import { Screen } from '../ui/Screen';
import { fonts, palette, radius, space } from '../ui/theme';

export default function Parents() {
  const { services, entitlements, purchaseRemoveAds, restorePurchases } = useApp();
  const [passed, setPassed] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const onPass = useCallback(() => setPassed(true), []);

  useEffect(() => {
    if (!passed) return;
    services.purchases
      .getProducts()
      .then((ps) => setProduct(ps.find((p) => p.id === REMOVE_ADS_PRODUCT_ID) ?? null))
      .catch(() => setProduct(null));
  }, [passed, services]);

  const buy = async () => {
    setBusy('buy');
    setMessage(null);
    const r = await purchaseRemoveAds(REMOVE_ADS_PRODUCT_ID);
    setBusy(null);
    setMessage(
      r.status === 'success'
        ? 'Thank you! Ads are now removed on this device.'
        : r.status === 'cancelled'
          ? 'Purchase cancelled. Nothing was charged.'
          : r.status === 'pending'
            ? 'The purchase is waiting for approval. Ads will be removed once it completes.'
            : `The purchase didn’t go through: ${r.message} Nothing was charged.`,
    );
  };

  const restore = async () => {
    setBusy('restore');
    setMessage(null);
    const r = await restorePurchases();
    setBusy(null);
    setMessage(
      r.status === 'restored'
        ? r.productIds.includes(REMOVE_ADS_PRODUCT_ID)
          ? 'Restored. Ads are removed.'
          : 'Restored, but no ad removal was found.'
        : r.status === 'nothing-to-restore'
          ? 'No previous purchases were found for this store account.'
          : `Couldn’t reach the store: ${r.message} Please try again later.`,
    );
  };

  return (
    <Screen title="Parents">
      {!passed ? (
        <ParentalGate onPass={onPass} />
      ) : (
        <View style={styles.body}>
          <View style={styles.card}>
            <Text style={styles.heading}>Ad-free Forge Five</Text>
            <Text style={styles.text}>
              Forge Five is free to play. The only ads are non-personalised and never appear while a puzzle is being built. A single
              purchase removes them for good. There are no subscriptions and nothing else to buy.
            </Text>
            {entitlements.adFree ? (
              <Text style={styles.owned} accessibilityLiveRegion="polite">
                ✓ Ads are removed on this device.
              </Text>
            ) : (
              <Button
                title={product ? `Remove ads · ${product.displayPrice}` : 'Remove ads'}
                onPress={buy}
                disabled={busy !== null}
                icon="lock"
                testID="buy-remove-ads"
              />
            )}
            <Button title="Restore purchases" kind="secondary" onPress={restore} disabled={busy !== null} testID="restore" />
            {busy && <ActivityIndicator color={palette.ember} />}
            {message && (
              <Text style={styles.message} accessibilityLiveRegion="polite">
                {message}
              </Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>Privacy at a glance</Text>
            <Text style={styles.text}>
              No accounts, no names, no birthdays, no location and no tracking. Progress and statistics stay on this device.
            </Text>
            <Button title="Read the privacy details" kind="ghost" onPress={() => router.push('/privacy')} />
          </View>

          {services.purchases.provider === 'mock' && (
            <Text style={styles.devNote}>Development build: purchases are simulated and no money changes hands.</Text>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg, paddingTop: space.md },
  card: { backgroundColor: palette.steel, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: palette.chalk },
  text: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: palette.mist },
  owned: { fontFamily: fonts.semibold, fontSize: 16, color: palette.success },
  message: { fontFamily: fonts.medium, fontSize: 14, color: palette.chalk, lineHeight: 20 },
  devNote: { fontFamily: fonts.regular, fontSize: 12, color: palette.mist, textAlign: 'center' },
});
