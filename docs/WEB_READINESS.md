# Web and Chromebook readiness assessment

**Summary: the web edition is technically viable today with no engine changes.** The same TypeScript engine, reducer and screens run under Expo web (`react-native-web`). The remaining work is product polish and hosting, not a rewrite.

## What already works (verified in Chrome via Expo web)

| Capability | Status |
|---|---|
| Engine, solver, generator, validation | Identical code path. Pure TypeScript, no platform imports (enforced by a test). |
| Rendering: pieces, target plate, forge glow, seal, icons | react-native-svg renders to SVG in the DOM. |
| Phone, tablet and wide layouts | Single column up to 640 px; two columns at ≥ 900 px wide in landscape (checked at 1366×768). |
| Mouse / touch-screen | All controls are pressables. Tap and click behave the same. |
| Keyboard play | Digits map to available pieces only (no free constants). `+ - * x /`, ← →, Home/End, Backspace, Enter = the Forge/Check button, `f` = Forge, Ctrl/Cmd-Z undo, Shift+Ctrl/Cmd-Z redo, Esc clears the selection. |
| Focus visibility | Ember focus ring shown for keyboard focus only (focus-visible behaviour). |
| Persistence | AsyncStorage uses `localStorage`. Falls back gracefully if storage is blocked. |
| Offline | No network needed after load. A service worker (PWA) would allow offline launch. |
| Sound | expo-audio web backend; the browser's autoplay policy is satisfied because sounds follow taps. |
| Haptics | No-op on web by design. |
| Ads | `NoAdService` by default. The AdSlot renders nothing when an ad fails or is blocked. |

## Gaps before a public web launch

1. **Hosting and routing.** Done for the demo: static export (`npm run build:web`) deployed by Vercel from `main` at https://forgefive.vercel.app, with an SPA rewrite in `vercel.json`. Consider `web.output: static` later for SEO pages.
2. **Classroom / presentation mode.** Ad-free by design, bigger type, and a "projector" layout. Not built yet.
3. **Keyboard discoverability.** Show a small shortcuts legend on wide screens.
4. **Tab order audit.** Verify logical order tray → bench → tools → actions with a screen reader (NVDA/ChromeVox).
5. **PWA manifest and icons.** Needs the final artwork.
6. **Web purchases.** Mobile purchases won't transfer automatically. Decide whether the web edition is free/ad-free or has its own unlock. ⚖️
7. **Web ads.** Separate policy review, and ad blockers must be tolerated. The code already handles failure silently. ⚖️
8. **Performance budget.** Measure bundle size and first-load time after the final assets. Consider lazy-loading non-game screens.
9. **Browser privacy.** No third-party cookies or storage are used. Keep it that way.

## Chromebook specifics

- Landscape 1366×768 is the common case and gets the two-column layout.
- Touch-screen Chromebooks work with the same pressables.
- Google Classroom links: a deep link such as `/play` works with the current router. A future daily-challenge URL could carry a seed (`?seed=`), because generation is deterministic.

## Risk

Low. The architecture decision that mattered, a pure engine plus react-native-web-compatible UI, is already in place and exercised.
