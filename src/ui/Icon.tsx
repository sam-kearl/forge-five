import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/** Original line icons drawn for Forge Five (24×24 grid, 2px strokes). */
export type IconName =
  | 'undo'
  | 'redo'
  | 'backspace'
  | 'left'
  | 'right'
  | 'spark'
  | 'seal'
  | 'gear'
  | 'chart'
  | 'home'
  | 'help'
  | 'lock'
  | 'clear'
  | 'split'
  | 'shuffle'
  | 'close'
  | 'check'
  | 'info'
  | 'play';

const PATHS: Record<IconName, string[]> = {
  undo: ['M9 7 L4 12 L9 17', 'M4 12 H14 a5 5 0 0 1 0 10 H11'],
  redo: ['M15 7 L20 12 L15 17', 'M20 12 H10 a5 5 0 0 0 0 10 H13'],
  backspace: ['M9 5 H20 V19 H9 L3 12 Z', 'M12 9 L17 15', 'M17 9 L12 15'],
  left: ['M15 5 L8 12 L15 19'],
  right: ['M9 5 L16 12 L9 19'],
  spark: ['M12 2 V7', 'M12 17 V22', 'M2 12 H7', 'M17 12 H22', 'M5 5 L8.5 8.5', 'M15.5 15.5 L19 19', 'M19 5 L15.5 8.5', 'M8.5 15.5 L5 19'],
  seal: [
    'M12 2 L14.2 4.6 L17.5 4 L18.2 7.3 L21.2 8.8 L19.9 12 L21.2 15.2 L18.2 16.7 L17.5 20 L14.2 19.4 L12 22 L9.8 19.4 L6.5 20 L5.8 16.7 L2.8 15.2 L4.1 12 L2.8 8.8 L5.8 7.3 L6.5 4 L9.8 4.6 Z',
    'M8 12 L11 15 L16 9',
  ],
  gear: [
    'M19.42 10.37 L21.91 10.63 L21.91 13.37 L19.42 13.63 L18.40 16.10 L19.97 18.04 L18.04 19.97 L16.10 18.40 L13.63 19.42 L13.37 21.91 L10.63 21.91 L10.37 19.42 L7.90 18.40 L5.96 19.97 L4.03 18.04 L5.60 16.10 L4.58 13.63 L2.09 13.37 L2.09 10.63 L4.58 10.37 L5.60 7.90 L4.03 5.96 L5.96 4.03 L7.90 5.60 L10.37 4.58 L10.63 2.09 L13.37 2.09 L13.63 4.58 L16.10 5.60 L18.04 4.03 L19.97 5.96 L18.40 7.90 Z',
    'M12 8.8 a3.2 3.2 0 1 0 0.01 0',
  ],
  chart: ['M4 20 V10', 'M10 20 V4', 'M16 20 V13', 'M22 20 H2'],
  home: ['M3 11 L12 3 L21 11', 'M5 9.5 V21 H19 V9.5', 'M10 21 V15 H14 V21'],
  help: ['M9 9 a3 3 0 1 1 4.5 2.6 c-1 .6 -1.5 1.2 -1.5 2.4', 'M12 18 V18.5'],
  lock: ['M6 11 H18 V21 H6 Z', 'M8.5 11 V8 a3.5 3.5 0 0 1 7 0 V11'],
  clear: ['M5 7 H19', 'M9 7 V4 H15 V7', 'M7 7 L8 21 H16 L17 7'],
  split: ['M12 3 V9', 'M12 9 L6 15 V21', 'M12 9 L18 15 V21'],
  shuffle: ['M3 7 H8 L16 17 H21', 'M3 17 H8 L16 7 H21', 'M18 4 L21 7 L18 10', 'M18 14 L21 17 L18 20'],
  close: ['M6 6 L18 18', 'M18 6 L6 18'],
  check: ['M5 12.5 L10 17.5 L19 7'],
  info: ['M12 11 V17', 'M12 7.5 V8'],
  play: ['M8 5 L19 12 L8 19 Z'],
};

const CIRCLED: Partial<Record<IconName, boolean>> = { help: true, info: true };

export function Icon({
  name,
  size = 22,
  color = '#fff',
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {CIRCLED[name] && <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={strokeWidth} fill="none" />}
        {PATHS[name].map((d, i) => (
          <Path
            key={i}
            d={d}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={name === 'play' ? color : 'none'}
          />
        ))}
      </Svg>
    </View>
  );
}
