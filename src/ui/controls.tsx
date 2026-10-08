import { useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GradientFill, GRADIENTS } from './GradientFill';
import { Icon, type IconName } from './Icon';
import { focusFromKeyboard } from './inputModality';
import { colors, fonts, palette, radius, space, TOUCH } from './theme';

interface BaseProps {
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (e: AccessibilityActionEvent) => void;
  disabled?: boolean;
  selected?: boolean;
  /** 'radio' for one choice in a group (announced as "radio button, checked"); `selected` is then its checked state. */
  role?: 'button' | 'radio';
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  testID?: string;
}

/**
 * The single pressable primitive: guarantees a 48pt target, a visible
 * keyboard-focus ring (web), pressed feedback and full accessibility metadata.
 */
export function Tap({
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityActions,
  onAccessibilityAction,
  disabled,
  selected,
  role = 'button',
  style,
  children,
  testID,
}: BaseProps) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      onFocus={() => setFocused(focusFromKeyboard())}
      onBlur={() => setFocused(false)}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={role === 'radio' ? { disabled: !!disabled, checked: !!selected } : { disabled: !!disabled, selected: !!selected }}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      hitSlop={4}
      style={({ pressed }) => [
        { minWidth: TOUCH, minHeight: TOUCH, opacity: disabled ? 0.45 : 1 },
        style,
        pressed && !disabled && styles.pressed,
        Platform.OS === 'web' && (WEB_RESET as ViewStyle),
        focused && styles.focus,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function ToolKey({
  symbol,
  icon,
  label,
  onPress,
  disabled,
  tone = 'iron',
  testID,
  height = 52,
}: {
  symbol?: string;
  icon?: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'iron' | 'danger';
  testID?: string;
  height?: number;
}) {
  const danger = tone === 'danger';
  return (
    <Tap
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={[styles.key, { height }, symbol ? styles.keyRaised : null, danger && styles.keyDanger]}
    >
      <GradientFill stops={danger ? GRADIENTS.danger : symbol ? GRADIENTS.iron : GRADIENTS.ironLow} />
      <View style={styles.keyInner}>
        {symbol ? (
          <Text allowFontScaling={false} style={[styles.keySymbol, { fontSize: Math.round(height * 0.66) }]}>
            {symbol}
          </Text>
        ) : (
          icon && <Icon name={icon} color={danger ? '#FFE7DF' : '#CDB8A6'} size={22} />
        )}
      </View>
    </Tap>
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  accessibilityHint,
  testID,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'forge' | 'secondary' | 'ghost';
  icon?: IconName;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const k = BUTTON_KINDS[kind];
  return (
    <Tap
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      style={[styles.button, { backgroundColor: k.bg, borderColor: k.border }, kind === 'primary' && styles.buttonGlow, style]}
    >
      {k.fill && <GradientFill stops={k.fill} />}
      <View style={styles.buttonInner}>
        {icon && <Icon name={icon} color={k.fg} size={20} />}
        <Text style={[styles.buttonText, { color: k.fg }]} maxFontSizeMultiplier={1.5}>
          {title}
        </Text>
      </View>
    </Tap>
  );
}

/** Web only: the custom focus ring replaces the browser outline. */
const WEB_RESET: unknown = { outlineStyle: 'none', cursor: 'pointer' };

const BUTTON_KINDS: Record<
  'primary' | 'forge' | 'secondary' | 'ghost',
  { bg: string; fg: string; border: string; fill?: typeof GRADIENTS.iron | typeof GRADIENTS.molten }
> = {
  primary: { bg: palette.brass, fg: palette.brassInk, border: '#FFE2A6', fill: GRADIENTS.molten },
  forge: { bg: palette.flux, fg: palette.chalk, border: '#FF9A78' },
  secondary: { bg: palette.steelHi, fg: palette.chalk, border: 'rgba(255,255,255,0.1)', fill: GRADIENTS.iron },
  ghost: { bg: 'transparent', fg: palette.chalk, border: palette.steelLine },
};

export function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={styles.sectionLabel} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.85 },
  // Keyboard focus ring. On the web it's an outline, which doesn't take up space or shift the layout.
  focus:
    Platform.OS === 'web'
      ? ({ outlineColor: colors.focus, outlineStyle: 'solid', outlineWidth: 3, outlineOffset: 2, borderRadius: radius.md } as ViewStyle)
      : { borderWidth: 3, borderColor: colors.focus, borderRadius: radius.md },
  key: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: palette.ironBottom,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  keyRaised: { borderColor: 'rgba(255,255,255,0.07)', borderTopColor: 'rgba(255,255,255,0.14)' },
  keyDanger: { backgroundColor: palette.dangerDeep, borderColor: 'rgba(255,120,100,0.35)', boxShadow: '0 0 16px rgba(220,40,20,0.25)' },
  keyInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  keySymbol: { fontFamily: fonts.black, fontSize: 30, color: palette.chalk, includeFontPadding: false },
  button: {
    minHeight: 54,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  buttonGlow: { boxShadow: '0 0 24px rgba(255,140,40,0.35)' },
  buttonText: { fontFamily: fonts.bold, fontSize: 18 },
  sectionLabel: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 3, color: palette.mist, textTransform: 'uppercase' },
});
