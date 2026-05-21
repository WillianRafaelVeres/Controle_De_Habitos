import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

type MiniBarChartItem = {
  label: string;
  value: number;
};

type MiniBarChartProps = {
  data: MiniBarChartItem[];
  maxValue: number;
  height?: number;
};

export function MiniBarChart({ data, maxValue, height = 104 }: MiniBarChartProps) {
  return (
    <View style={[styles.container, { height }]}>
      {data.map((item) => {
        const percentage = maxValue > 0 ? item.value / maxValue : 0;
        const barHeight = Math.max(8, Math.round((height - 34) * percentage));

        return (
          <View style={styles.item} key={item.label}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: barHeight }]} />
            </View>
            <Text style={styles.label}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  barTrack: {
    width: '100%',
    flex: 1,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(148, 163, 184, 0.14)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: radii.sm,
    backgroundColor: colors.secondary,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: '700',
  },
});
