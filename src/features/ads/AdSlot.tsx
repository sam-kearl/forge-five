import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { mayShowAd, type AdContent, type AdPlacement } from '../../services/ads';
import { useApp } from '../../state/AppContext';
import { Tap } from '../../ui/controls';
import { fonts, radius, space } from '../../ui/theme';

/**
 * A clearly separated, clearly labelled ad frame. It uses a neutral grey
 * style unlike any game element, is never interactive in the mock, and
 * renders nothing at all when ads are removed, unavailable, failing or offline.
 */
export function AdSlot({ placement, solvedCount }: { placement: AdPlacement; solvedCount: number }) {
  const { services, entitlements } = useApp();
  const allowed = mayShowAd({ placement, adFree: entitlements.adFree, solvedCount, inActivePuzzle: false });
  const [ad, setAd] = useState<AdContent | null>(null);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    if (!allowed) return; // nothing renders when not allowed, so no state reset is needed
    let alive = true;
    services.ads
      .load(placement)
      .then((r) => alive && setAd(r.status === 'loaded' ? r.ad : null))
      .catch(() => alive && setAd(null));
    return () => {
      alive = false;
    };
  }, [allowed, placement, services]);

  if (!allowed || !ad) return null;
  return (
    <View style={styles.wrap} accessibilityRole="none" accessibilityLabel="Advertisement">
      <Text style={styles.label}>Advertisement</Text>
      <View style={styles.frame}>
        <Text style={styles.headline}>{ad.headline}</Text>
        <Text style={styles.body}>{ad.body}</Text>
      </View>
      {services.ads.report && (
        <Tap
          onPress={() => {
            services.ads.report?.(ad.id, 'inappropriate').catch(() => {});
            setReported(true);
          }}
          accessibilityLabel="Report this ad"
          style={styles.report}
          disabled={reported}
        >
          <Text style={styles.reportText}>{reported ? 'Reported — thank you' : 'Report this ad'}</Text>
        </Tap>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.xl, alignSelf: 'stretch', alignItems: 'center' },
  label: { fontFamily: fonts.medium, fontSize: 11, color: '#9AA0A8', letterSpacing: 1, marginBottom: 4 },
  frame: {
    alignSelf: 'stretch',
    minHeight: 60,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#6B7078',
    backgroundColor: '#2A2D31',
    padding: space.md,
    justifyContent: 'center',
  },
  headline: { fontFamily: fonts.medium, fontSize: 14, color: '#D5D8DC' },
  body: { fontFamily: fonts.regular, fontSize: 12, color: '#A5AAB1', marginTop: 2 },
  report: { minHeight: 36, justifyContent: 'center' },
  reportText: { fontFamily: fonts.regular, fontSize: 12, color: '#9AA0A8', textDecorationLine: 'underline' },
});
