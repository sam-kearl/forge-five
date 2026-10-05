# App Store and Google Play pre-release checklist

Tick every item for each release candidate. Items marked ⚖️ need professional sign-off (see REVIEW_ITEMS.md).

## 1. Product and assets

- [ ] Final name cleared ⚖️ (T1). App display name set in `app.json`.
- [ ] Bundle id / package name replaced (`com.example.forgefive` is a placeholder).
- [x] Original app icon, adaptive icon (foreground, background, monochrome), splash image and favicon (`npm run icons`). Consider a professional icon pass before launch.
- [ ] Version and build numbers bumped (`version`, `ios.buildNumber`, `android.versionCode`).
- [ ] Barlow / Barlow Condensed OFL licence text included in the app's notices.
- [ ] Store screenshots for small phone, large phone and iPad (portrait); descriptions with original marketing copy that never compares Forge Five to other games.

## 2. Monetisation

- [ ] Ad provider chosen and reviewed ⚖️ (A1–A6), or ads left off (`NoAdService`) for launch.
- [ ] Real purchase implementation behind `PurchaseService`. Non-consumable "remove ads" product configured in App Store Connect and Play Console ⚖️ (G2–G4).
- [ ] Restore Purchases works on a fresh install and a second device.
- [ ] Parental gate reviewed ⚖️ (G1).
- [ ] Mock services unreachable in production builds (check `createDefaultServices`).

## 3. Privacy and policy

- [ ] Privacy policy published and linked in the stores and the app ⚖️ (P3).
- [ ] App Store privacy label and Play Data safety match PRIVACY_INVENTORY.md ⚖️ (P4).
- [ ] Generated `Info.plist` and `AndroidManifest.xml` inspected: no microphone, camera or location entries, and no unexpected permissions.
- [ ] Apple: Kids Category decision ⚖️. Age rating questionnaire answered.
- [ ] Google Play: target audience and content, Families policy declarations ⚖️.
- [ ] `ITSAppUsesNonExemptEncryption` = false (set via `ios.config.usesNonExemptEncryption`).
- [ ] Privacy manifest (`PrivacyInfo.xcprivacy`) reviewed. Expo modules supply their own. Add required-reason API entries if needed.

## 4. Automated checks

- [ ] `npm test` passes (≈430 tests).
- [ ] `npm run typecheck` passes.
- [ ] `npx expo-doctor` is clean.
- [ ] `npx tsx scripts/puzzle-report.ts 1000` shows 100% tier-0 generation and a p90 generation time < 50 ms on the development machine.

## 5. Manual verification (spec §22)

Run on real hardware where possible (Hermes performance differs from simulators).

| Area | Devices / settings | Pass |
|---|---|---|
| Small phone | iPhone SE-class / Android ~5.5" | [ ] |
| Large phone | Pro Max / large Android | [ ] |
| Tablet | iPad, Android tablet | [ ] |
| iOS & Android | Latest and oldest supported OS | [ ] |
| Portrait orientation | Locked portrait on phones | [ ] |
| Touch input | Rapid tapping; tools never shift position | [ ] |
| Tap-only play | Complete a puzzle, including forge and break apart, without gestures | [ ] |
| Screen readers | VoiceOver and TalkBack: target, pieces (including duplicates), bench, forged provenance, errors, solved | [ ] |
| Large text | Largest Dynamic Type / font scale | [ ] |
| Reduced motion | System setting and in-app override | [ ] |
| Sound off / haptics off | Independently | [ ] |
| Offline | Airplane mode: generate, play, tutorial, stats | [ ] |
| Interrupted session | Background mid-puzzle, kill the app, relaunch: same puzzle and bench | [ ] |
| Duplicate values | Puzzle with two equal pieces: each labelled and consumed separately | [ ] |
| Long equations | All five pieces with nested brackets fit and wrap | [ ] |
| Parentheses-heavy | `((a + b) × (c − d)) ÷ e` | [ ] |
| Ad-free state | After purchase and after restore: no ad frames anywhere | [ ] |
| Failed ads | `MockAdService('fail'/'offline')`: layout unaffected | [ ] |
| Failed purchase | Cancel, fail, pending: clear messages, no entitlement change | [ ] |
| Basic web rendering | `npx expo start --web` in Chrome at phone, tablet and 1366×768 | [ ] |

## 6. Build and submit

```bash
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform ios
npx eas-cli@latest submit --platform android
```

(Create `eas.json` with development, preview and production profiles at the first EAS setup.)
