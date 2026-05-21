import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import type { MonthlyProgressPoint } from '../types';
import { colors, radii, spacing, typography } from '../theme';

type YearlyLineChartProps = {
  data: MonthlyProgressPoint[];
};

export function YearlyLineChart({ data }: YearlyLineChartProps) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(width - 64, 340);

  if (data.length === 0) {
    return <Text style={styles.empty}>Sem dados para este ano.</Text>;
  }

  return (
    <View style={styles.chartShell}>
      <LineChart
        data={{
          labels: data.map((item) => item.label),
          datasets: [{ data: data.map((item) => item.percentage) }],
        }}
        width={chartWidth}
        height={214}
        fromZero
        segments={4}
        yAxisSuffix="%"
        bezier
        chartConfig={chartConfig}
        style={styles.chart}
      />
    </View>
  );
}

const chartConfig = {
  backgroundGradientFrom: colors.surfaceStrong,
  backgroundGradientTo: colors.surfaceMuted,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(124, 92, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(170, 180, 212, ${opacity})`,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: colors.primary,
  },
  propsForBackgroundLines: {
    stroke: 'rgba(148, 163, 184, 0.13)',
  },
};

const styles = StyleSheet.create({
  chartShell: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  chart: {
    borderRadius: radii.lg,
    paddingRight: spacing.lg,
  },
  empty: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
});
