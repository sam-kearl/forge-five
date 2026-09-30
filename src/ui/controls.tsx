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
import { Icon, type IconName } from './Icon';
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
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      hitSlop={4}
      style={({ pressed }) => [
        { minWidth: TOUCH, minHeight: TOUCH, opacity: disabled ? 0.45 : 1 },
        style,
        pressed && !disabled && styles.pressed,
        focused && styles.focus,
        Platform.OS === 'web' && (WEB_RESET as ViewStyle),
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
  wide,
  tone = 'steel',
  testID,
}: {
  symbol?: string;
  icon?: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  wide?: boolean;
  tone?: 'steel' | 'blueprint';
  testID?: string;
}) {
  return (
    <Tap
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={[styles.key, wide && { flex: 1.4 }, tone === 'blueprint' && styles.keyBlueprint]}
    >
      <View style={styles.keyInner}>
        {symbol ? (
          <Text allowFontScaling={false} style={[styles.keySymbol, tone === 'blueprint' && { color: palette.blueprintLine }]}>
            {symbol}
          </Text>
        ) : (
          icon && <Icon name={icon} color={palette.chalk} size={22} />
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
      style={[styles.button, { backgroundColor: k.bg, borderColor: k.border }, style]}
    >
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

const BUTTON_KINDS = {
  primary: { bg: palette.ember, fg: palette.brassInk, border: '#FFD08A' },
  forge: { bg: palette.flux, fg: palette.chalk, border: '#FF9A78' },
  secondary: { bg: palette.steelHi, fg: palette.chalk, border: palette.steelLine },
  ghost: { bg: 'transparent', fg: palette.chalk, border: palette.steelLine },
} as const;

export function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={styles.sectionLabel} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.85 },
  focus: {
    borderWidth: 3,
    borderColor: colors.focus,
    borderRadius: radius.md,
  },
  key: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: palette.steelHi,
    borderWidth: 1,
    borderColor: palette.steelLine,
    borderBottomWidth: 3,
    borderBottomColor: palette.inkDeep,
  },
  keyBlueprint: { backgroundColor: palette.blueprintDeep, borderColor: '#2A5C8C' },
  keyInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  keySymbol: { fontFamily: fonts.bold, fontSize: 28, color: palette.chalk, includeFontPadding: false },
  button: {
    minHeight: 54,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  buttonText: { fontFamily: fonts.bold, fontSize: 18 },
  sectionLabel: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.6, color: palette.mist, textTransform: 'uppercase' },
});
