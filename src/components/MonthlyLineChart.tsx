import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import type { DailyProgressPoint } from '../types';
import { colors, radii, spacing, typography } from '../theme';

type MonthlyLineChartProps = {
  data: DailyProgressPoint[];
};

export function MonthlyLineChart({ data }: MonthlyLineChartProps) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(260, width - 64);

  if (data.length === 0) {
    return <Text style={styles.empty}>Sem dados para este mes.</Text>;
  }

  return (
    <View style={styles.chartShell}>
      <LineChart
        data={{
          labels: data.map((item) => (item.day === 1 || item.day % 7 === 0 ? String(item.day) : '')),
          datasets: [{ data: data.map((item) => item.percentage) }],
        }}
        width={chartWidth}
        height={166}
        fromZero
        segments={4}
        yAxisSuffix="%"
        bezier
        withDots={false}
        withShadow={false}
        chartConfig={chartConfig}
        style={styles.chart}
      />
    </View>
  );
}

const chartConfig = {
  backgroundGradientFrom: colors.surface,
  backgroundGradientTo: colors.surface,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(38, 217, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(170, 180, 212, ${opacity})`,
  propsForDots: {
    r: '3',
    strokeWidth: '1',
    stroke: colors.secondary,
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
    paddingRight: spacing.sm,
  },
  empty: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
});
