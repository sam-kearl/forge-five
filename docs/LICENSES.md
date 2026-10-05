# Dependency and asset licence inventory

Last reviewed: 2026-09-29. Regenerate the transitive list with `npx license-checker-rseidelsohn --production --summary` before each release.

> This is an engineering inventory, not legal advice. Commercial use of each item should be confirmed by a qualified professional before release.

## Runtime dependencies (shipped in the app)

| Package | Version | Licence | Why it is needed |
|---|---|---|---|
| expo | 57.0.x | MIT | App runtime, module system, build tooling |
| react / react-dom | 19.2.3 | MIT | UI library (react-dom only for the web target) |
| react-native | 0.86.3 | MIT | Native UI framework |
| react-native-web | 0.21.x | MIT | Web target (keeps the web edition possible without a rewrite) |
| expo-router | 57.0.x | MIT | File-based navigation between screens |
| react-native-screens | 4.26.x | MIT | Native screen containers used by the router |
| react-native-safe-area-context | 5.7.x | MIT | Notch and home-indicator safe areas |
| expo-linking, expo-constants | 57.0.x | MIT | Required by the router; app version on the About screen |
| expo-status-bar, expo-system-ui | 57.0.x | MIT | Status-bar style and native root background colour |
| expo-splash-screen | 57.0.x | MIT | Launch screen while fonts and saved data load |
| expo-font | 57.0.x | MIT | Loads the Barlow typefaces |
| expo-asset | 57.0.x | MIT | Required peer of expo-audio; resolves bundled sound files |
| @expo-google-fonts/barlow, @expo-google-fonts/barlow-condensed | 0.4.x | MIT (package) + OFL-1.1 (font files) | Packaged Barlow and Barlow Condensed font files |
| @react-native-async-storage/async-storage | 2.2.0 | MIT | Local-only storage of settings, stats and the current puzzle |
| expo-audio | 57.0.x | MIT | Plays the short sound effects. Recording and background audio are disabled in `app.json`. |
| expo-haptics | 57.0.x | MIT | Optional vibration feedback |
| react-native-svg | 15.15.x | MIT | Draws the pieces, target plate, forge glow, gradients, seal, logo and icons |
| expo-dev-client | 57.0.x | MIT | Development builds only (not part of production behaviour) |
| react-native-reanimated, react-native-gesture-handler, react-native-worklets, react-native-drawer-layout, @expo/ui | per expo-router | MIT | Transitive native dependencies of expo-router. Forge Five's own code uses React Native's built-in `Animated` API. |

## Development-only dependencies

| Package | Licence | Purpose |
|---|---|---|
| jest, jest-expo | MIT | Test runner and Expo preset |
| @testing-library/react-native | MIT | Rendered component tests |
| typescript | Apache-2.0 | Type checking |
| prettier | MIT | Formatting |
| tsx | MIT | Running TypeScript scripts (puzzle report) |
| @types/jest, @types/node, @types/react | MIT | Type definitions |

## Notable transitive licences

Most transitive packages are MIT, ISC, BSD or Apache-2.0. The exceptions below are all **build-time tooling** used by Expo CLI and Metro, not code bundled into the app:

| Package | Licence | Where it comes from |
|---|---|---|
| lightningcss (+ darwin-arm64 binary) | MPL-2.0 | CSS tooling in the Expo/Metro web pipeline |
| caniuse-lite | CC-BY-4.0 | Browser data for build tooling |
| argparse | Python-2.0 | CLI parsing inside tooling |
| node-forge | BSD-3-Clause OR GPL-2.0 (choose BSD) | Dev-server HTTPS tooling |

**Review item:** confirm none of these end up in the shipped JavaScript bundle (inspect an `npx expo export` bundle before release).

## Fonts

| Font | Author | Licence | Commercial use | Notes |
|---|---|---|---|---|
| Barlow (400–700) and Barlow Condensed (700–800) | Jeremy Tribby (The Barlow Project Authors) | SIL Open Font License 1.1 | Permitted, including embedding in apps | No reserved font name. They are used unmodified. The OFL text ships in `node_modules/@expo-google-fonts/barlow/LICENSE_FONT` (and the same file in `barlow-condensed`) and should be included in the About screen or app bundle notices. |

## Sounds

| File | Origin | Licence |
|---|---|---|
| `assets/sounds/*.wav` (tap, tool, forge, undo, invalid, success) | Synthesised from sine waves, noise and envelopes by `scripts/synth-sounds.js`, written for this project. No samples or third-party audio. | Original work owned by the project |

## Illustrations, icons and artwork

| Asset | Origin |
|---|---|
| Iron and molten hexagon pieces, riveted target plate, forge fire and embers, hammer icon, seal stamp, logo mark, forge burst | Drawn in code (`src/ui/*`), original |
| Line icons (undo, redo, spark, seal, gear…) | Drawn in code (`src/ui/Icon.tsx`), original. No icon library is used. |
| App icon, splash, favicon and adaptive-icon PNGs in `assets/` | Original, rendered from the logo geometry by `scripts/make-icons.js` (no third-party artwork) |

## Native tooling installed on the development Mac (not shipped)

- Node.js 22 LTS (MIT), installed in `~/.local/node`.
- CocoaPods 1.17 (MIT), installed in `~/.gem`.
