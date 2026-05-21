import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../theme';

type ProgressBarProps = {
  value: number;
  height?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function ProgressBar({ value, height = 9, color, style }: ProgressBarProps) {
  const width = `${Math.max(0, Math.min(100, value))}%` as DimensionValue;

  return (
    <View style={[styles.track, { height, borderRadius: height }, style]}>
      {color ? (
        <View style={[styles.fill, { width, backgroundColor: color, borderRadius: height }]} />
      ) : (
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width, borderRadius: height }]}
        />
      )}
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
