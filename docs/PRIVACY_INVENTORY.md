# Privacy and data-flow inventory

Status: initial release candidate, with **no ad or purchase SDK integrated** (both are mocks). This inventory must be updated whenever an SDK, permission, stored field or network call changes.

## Summary

- No account, registration, name, email, birthdate, contacts, photos, camera, microphone or location.
- No analytics, crash reporting, advertising identifiers or tracking SDKs.
- All progress lives on the device. **Nothing is transmitted off the device** by Forge Five's own code.
- The core game works fully offline.

## SDKs and native modules

| SDK | Collects or transmits data? | Why present | How to disable or remove |
|---|---|---|---|
| Expo / React Native runtime | No data collection by the app. Development builds talk to the local Metro server only. | App framework | n/a |
| expo-audio | No. Recording is disabled (`microphonePermission: false`, `recordAudioAndroid: false`) and background audio is off. | Sound effects | Settings → Sound effects off (the player is never created) |
| expo-haptics | No | Vibration feedback | Settings → Vibration off |
| AsyncStorage | Local only | Settings, stats, current puzzle | Delete the app; Settings → Reset statistics |
| react-native-svg, fonts, router, safe-area, screens, splash, system-ui | No | UI | n/a |
| expo-dev-client | Development builds only | Developer tooling | Absent from production behaviour |
| **Advertising SDK** | **Not integrated.** `NoAdService` (default) or `MockAdService` (dev) | Future non-personalised ads | Behind the `AdService` interface. Remove-ads purchase. |
| **Purchase SDK** | **Not integrated.** `MockPurchaseService` | Future remove-ads purchase | Behind the `PurchaseService` interface |

## Permissions

| Platform | Permission | Requested? |
|---|---|---|
| iOS | Microphone (`NSMicrophoneUsageDescription`) | **No.** Disabled via the expo-audio plugin. |
| iOS | Background audio mode | **No.** `enableBackgroundPlayback: false` |
| iOS | Camera, photos, location, contacts, tracking (ATT) | No |
| Android | `RECORD_AUDIO` | **No** (`recordAudioAndroid: false`) |
| Android | `VIBRATE` | Yes, added by expo-haptics. Normal permission, granted at install. |
| Android | `INTERNET` | Present by default in React Native builds. Needed for development builds (Metro). The game itself makes no requests. |
| Android | Foreground media service | **No** (background playback disabled) |

**Release task:** after `npx expo prebuild`, inspect the generated `AndroidManifest.xml` and `Info.plist` and reconcile them with this table.

## Locally stored fields

All keys live in AsyncStorage (native storage on device; `localStorage` on web).

| Key | Contents | Purpose | Removal |
|---|---|---|---|
| `ff.settings.v1` | `sound`, `haptics`, `motion` (system/reduced/full) | Preferences | Delete app |
| `ff.stats.v1` | Counts (solved, dealt, skipped), total and fastest solve time, forges, tool usage counts, day streak, best streak, last solve date (local calendar day) | Stats screen | Settings → Reset statistics |
| `ff.game.v1` | Current puzzle (numbers, target, seed, one stored solution), current equation, undo history (last 60 steps), timings | Resume after interruption | Replaced on each new puzzle |
| `ff.recent.v1` | Target and sorted numbers of the last 30 puzzles | Avoid near-repeats | Rolling |
| `ff.tutorial.v1` | `completed` flag | Skip the tutorial prompt | Settings → Replay tutorial |
| `ff.entitlements.v1` | `adFree` flag, time last confirmed | Remember the remove-ads purchase | Delete app. Restore purchases re-creates it. |

No field contains personal information. Dates are local calendar days used only for the streak count.

## Network requests

| Request | When | Data sent |
|---|---|---|
| *(none by the game)* | — | — |
| Metro bundler (localhost/LAN) | Development builds only | JavaScript bundle download |
| App Store / Play Billing | Only when a parent taps Remove ads or Restore (after the parental gate), once a real purchase SDK is integrated | Handled by the platform store |
| Ad provider | Only if an approved provider is integrated in future | Must be non-personalised. Document the exact fields here before release. |

## Information transmitted off the device

None, in the current build.

## Future changes that require updating this document

- Integrating any ad SDK: list every field it transmits, its data-safety labels, SKAdNetwork IDs, and child-directed flags.
- Integrating a purchase SDK (StoreKit / Play Billing wrapper, RevenueCat or similar): list receipts, identifiers and any server calls.
- Adding crash reporting or analytics. These require separate review and approval under the product spec.
