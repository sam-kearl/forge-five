import { Platform } from 'react-native';

/**
 * Forge Five design tokens — "Molten Foundry".
 *
 * Identity: a smithy at night. Cast-iron surfaces, the forge fire glowing up
 * from below, and a heat scale for pieces: iron with a hot orange rim
 * (available), ember (selected), flux (being forged) and molten amber
 * (forged). Colour is never the only signal: every state also changes shape,
 * outline or text.
 */

export const palette = {
  ink: '#0A0705', // app background
  inkDeep: '#050302',
  steel: '#1C1612', // iron panels
  steelHi: '#2B221C', // raised iron / keys
  steelLine: '#3A2E26',
  ironTop: '#2B221C', // key gradient
  ironBottom: '#191310',
  plateTop: '#221A15', // plate and bench gradient
  plateBottom: '#130E0B',
  rivet: '#6B5A4E',
  blueprint: '#15406A', // kept for the logo's guide lines
  blueprintDeep: '#0E2F50',
  blueprintLine: '#C99A72', // engraved labels on iron
  coolant: '#FF8A2A', // hot rim: available pieces
  coolantDeep: '#7A2A0A',
  rim: '#E8702A', // the solid outline of a piece
  ember: '#FFB347', // warm: selected, cursor, sparks
  flux: '#FF6A2A', // hot: forging moment
  fire: '#FF6014', // the forge glow
  brass: '#F7A93C', // molten amber: forged pieces, the Forge button
  brassHi: '#FFD889',
  brassDeep: '#C9661A',
  brassInk: '#2A1404',
  amberText: '#FFC266', // amber text on iron
  timer: '#E9B884',
  ceramic: '#F5E9DC', // light parchment (proof card)
  ceramicEdge: '#D9C6B3',
  ceramicShade: '#E9DACB',
  chalk: '#F5E9DC', // primary text on iron
  graphite: '#2A1404', // text on light surfaces
  mist: '#A08F80', // secondary text on iron
  dim: '#7E6E61',
  quench: '#8EC5FF', // "quenched" issue colour on iron (always with icon + text)
  quenchInk: '#2B4C8C', // issue colour on light surfaces
  success: '#7CD992',
  danger: '#B3261A', // destructive actions (clear the bench)
  dangerDeep: '#7A160E',
  dangerEdge: '#E0705F',
} as const;

export const colors = {
  background: palette.ink,
  surface: palette.steel,
  surfaceRaised: palette.steelHi,
  border: palette.steelLine,
  text: palette.chalk,
  textMuted: palette.mist,
  textOnLight: palette.graphite,
  accent: palette.ember,
  focus: palette.ember,
  issue: palette.quench,
  issueOnLight: palette.quenchInk,
  good: palette.success,
} as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 16, xl: 22, pill: 999 } as const;

export const fonts = {
  regular: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
  /** Barlow Condensed: numbers, headings and stamped labels. */
  display: 'BarlowCondensed_700Bold',
  black: 'BarlowCondensed_800ExtraBold',
} as const;

export const type = {
  display: { fontFamily: fonts.black, fontSize: 34, letterSpacing: 0.5 },
  title: { fontFamily: fonts.bold, fontSize: 24 },
  heading: { fontFamily: fonts.semibold, fontSize: 18 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 3, textTransform: 'uppercase' as const },
  /** Numbers always use tabular figures so values don't jitter. */
  number: { fontFamily: fonts.black, fontVariant: ['tabular-nums' as const] },
} as const;

/** Motion durations (ms). Reduced motion replaces movement with short fades or nothing. */
export const motion = {
  quick: 110,
  normal: 180,
  forge: 320,
  stamp: 360,
} as const;

/** Native-driven animations run off the JS thread on iOS/Android; the web has no native driver. */
export const NATIVE_DRIVER = Platform.OS !== 'web';

/** Minimum touch target (points). */
export const TOUCH = 48;
