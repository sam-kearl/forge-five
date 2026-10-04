import { Platform } from 'react-native';

/**
 * Forge Five design tokens.
 *
 * Identity: a bright creative workshop at night. The signature is the
 * "heat scale" — pieces go from cool (available, coolant teal) to warm
 * (selected, ember) to hot (being forged, flux) to done (brass). Colour is
 * never the only signal: every state also changes shape, outline or text.
 */

export const palette = {
  ink: '#161B24', // app background
  inkDeep: '#0F131A',
  steel: '#262F3D', // panels, tool keys
  steelHi: '#35404F', // raised steel / pressed
  steelLine: '#4A5668',
  blueprint: '#15406A', // target card
  blueprintDeep: '#0E2F50',
  blueprintLine: '#6FB2E8',
  coolant: '#2EC4B6', // cool: available
  coolantDeep: '#1B8E84',
  ember: '#FFB03B', // warm: selected, cursor
  flux: '#FF6A3D', // hot: forging moment
  brass: '#E9C46A', // done: forged pieces, solved
  brassDeep: '#B8892F',
  brassInk: '#3A2A08',
  ceramic: '#F5F0E6', // bench surface and piece faces
  ceramicEdge: '#D9CFBD',
  ceramicShade: '#E9E1D2',
  chalk: '#FFFFFF',
  graphite: '#1E2430', // text on light surfaces
  mist: '#AEB8C7', // secondary text on dark
  quench: '#9B8CFF', // gentle "cooling" issue colour on dark surfaces (always with icon + text)
  quenchInk: '#4B3FB0', // issue colour on light surfaces
  success: '#7CD992',
  danger: '#C93C3C', // destructive actions (clear the bench)
  dangerEdge: '#E06666',
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
  regular: 'Lexend_400Regular',
  medium: 'Lexend_500Medium',
  semibold: 'Lexend_600SemiBold',
  bold: 'Lexend_700Bold',
  black: 'Lexend_800ExtraBold',
} as const;

export const type = {
  display: { fontFamily: fonts.black, fontSize: 34, letterSpacing: 0.5 },
  title: { fontFamily: fonts.bold, fontSize: 24 },
  heading: { fontFamily: fonts.semibold, fontSize: 18 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' as const },
  /** Numbers always use tabular figures so values don't jitter. */
  number: { fontFamily: fonts.bold, fontVariant: ['tabular-nums' as const] },
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
