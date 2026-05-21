import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import type { DailyProgressPoint } from '../types';
import { colors, radii, spacing, typography } from '../theme';

type MonthlyLineChartProps = {
  data: DailyProgressPoint[];
};

export function MonthlyLineChart({ data }: MonthlyLineChartProps) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(width - 64, data.length * 30);

  if (data.length === 0) {
    return <Text style={styles.empty}>Sem dados para este mes.</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.chartShell}>
        <LineChart
          data={{
            labels: data.map((item) => (item.day === 1 || item.day % 5 === 0 ? String(item.day) : '')),
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
    </ScrollView>
  );
}

const chartConfig = {
  backgroundGradientFrom: colors.surfaceStrong,
  backgroundGradientTo: colors.surfaceMuted,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(38, 217, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(170, 180, 212, ${opacity})`,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
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
    paddingRight: spacing.lg,
  },
  empty: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
});
