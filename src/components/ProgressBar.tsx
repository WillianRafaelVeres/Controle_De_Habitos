import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme';

type ProgressBarProps = {
  value: number;
  height?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function ProgressBar({ value, height = 9, color, style }: ProgressBarProps) {
  const width = `${Math.max(0, Math.min(100, value))}%` as DimensionValue;
  const fillColor = color ?? colors.secondary;

  return (
    <View style={[styles.track, { height, borderRadius: height }, style]}>
      <View style={[styles.fill, { width, backgroundColor: fillColor, borderRadius: height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
  },
  fill: {
    height: '100%',
    minWidth: 4,
  },
});
