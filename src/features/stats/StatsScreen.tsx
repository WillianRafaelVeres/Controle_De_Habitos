import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BarChart3 } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { MonthlyLineChart } from '../../components/MonthlyLineChart';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { YearlyLineChart } from '../../components/YearlyLineChart';
import { getAllLogs, getAllRoutines } from '../../database';
import { colors, radii, spacing, typography } from '../../theme';
import type { Routine, RoutineLog, RoutineProgress } from '../../types';
import {
  addDays,
  buildDailyProgressForMonth,
  buildMonthlyProgressForYear,
  calculateDailyPercentage,
  dateToKey,
  getMonthRange,
  getYearRange,
  todayKey,
} from '../../utils/date';
import { buildMonthStats, buildWeekdayCompletionRates, calculateCompletionRate } from '../../utils/metrics';
import { getRoutineColor } from '../../utils/routineVisuals';

type WeekdayScope = 'month' | 'last90' | 'history';
type EvolutionMode = 'month' | 'year';

export function StatsScreen() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [weekdayScope, setWeekdayScope] = useState<WeekdayScope>('last90');
  const [evolutionMode, setEvolutionMode] = useState<EvolutionMode>('month');
  const referenceDate = useMemo(() => new Date(), []);

  const loadStats = useCallback(async () => {
    const [allRoutines, allLogs] = await Promise.all([getAllRoutines(), getAllLogs()]);

    setRoutines(allRoutines);
    setLogs(allLogs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  const monthRange = useMemo(() => getMonthRange(referenceDate), [referenceDate]);
  const yearRange = useMemo(() => getYearRange(referenceDate.getFullYear()), [referenceDate]);
  const monthLogs = useMemo(
    () => logs.filter((log) => log.date >= monthRange.start && log.date <= monthRange.end),
    [logs, monthRange.end, monthRange.start],
  );
  const yearLogs = useMemo(
    () => logs.filter((log) => log.date >= yearRange.start && log.date <= yearRange.end),
    [logs, yearRange.end, yearRange.start],
  );
  const stats = useMemo(() => buildMonthStats(routines, monthLogs, referenceDate), [monthLogs, referenceDate, routines]);
  const monthCompletionRate = useMemo(
    () => calculateCompletionRate(routines, logs, monthRange.start, monthRange.end),
    [logs, monthRange.end, monthRange.start, routines],
  );
  const currentActiveRoutines = useMemo(() => routines.filter((routine) => routine.is_active === 1 && !routine.archived_at), [routines]);
  const todayProgress = useMemo(() => calculateDailyPercentage(todayKey(), currentActiveRoutines, logs), [currentActiveRoutines, logs]);
  const monthLineData = useMemo(() => buildDailyProgressForMonth(referenceDate, routines, monthLogs), [monthLogs, referenceDate, routines]);
  const yearLineData = useMemo(() => buildMonthlyProgressForYear(referenceDate.getFullYear(), routines, yearLogs), [referenceDate, routines, yearLogs]);
  const firstHistoryDate = useMemo(() => {
    const routineDates = routines.map((routine) => routine.created_at.slice(0, 10));
    const logDates = logs.map((log) => log.date);
    return [...routineDates, ...logDates].filter(Boolean).sort()[0] ?? monthRange.start;
  }, [logs, monthRange.start, routines]);
  const weekdayRange = useMemo(() => {
    if (weekdayScope === 'month') {
      return monthRange;
    }

    if (weekdayScope === 'last90') {
      return { start: dateToKey(addDays(new Date(), -89)), end: todayKey() };
    }

    return { start: firstHistoryDate, end: todayKey() };
  }, [firstHistoryDate, monthRange, weekdayScope]);
  const weekdayRates = useMemo(
    () => buildWeekdayCompletionRates(routines, logs, weekdayRange.start, weekdayRange.end),
    [logs, routines, weekdayRange.end, weekdayRange.start],
  );
  const routineProgress = useMemo(
    () => stats.routineProgress.filter((item) => item.goal > 0).sort((a, b) => b.percentage - a.percentage),
    [stats.routineProgress],
  );
  const comparableRoutines = useMemo(() => routineProgress.filter((item) => item.goal >= 3), [routineProgress]);
  const bestRoutine = comparableRoutines[0] ?? null;
  const worstRoutine = comparableRoutines.length >= 2 ? comparableRoutines[comparableRoutines.length - 1] : null;
  const hasAnyData = routines.length > 0 || logs.some((log) => log.completed === 1);

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Estatisticas</Text>
        <Text style={styles.subtitle}>Mes atual e historico</Text>
      </View>

      {!hasAnyData ? (
        <EmptyState icon={BarChart3} title="Sem dados" subtitle="As estatisticas aparecem quando houver rotinas e conclusoes registradas." />
      ) : (
        <>
          <Card style={styles.cardGap}>
            <SectionHeader title="Cumprimento mensal" subtitle={`${monthCompletionRate.completed} de ${monthCompletionRate.expected} metas previstas no mes`} />
            <Text style={styles.primaryValue}>{monthCompletionRate.percentage}%</Text>
            <ProgressBar value={monthCompletionRate.percentage} height={8} />
          </Card>

          <Card style={styles.todayCard}>
            <Text style={styles.sectionTitle}>Hoje</Text>
            <Text style={styles.todayText}>
              {todayProgress.completed} de {todayProgress.total} rotinas concluidas
            </Text>
          </Card>

          <Card style={styles.cardGap}>
            <View style={styles.sectionTop}>
              <SectionHeader title="Desempenho por dia da semana" subtitle={getWeekdayScopeLabel(weekdayScope)} />
              <SegmentedControl
                value={weekdayScope}
                options={[
                  { value: 'month', label: 'Mes' },
                  { value: 'last90', label: '90 dias' },
                  { value: 'history', label: 'Historico' },
                ]}
                onChange={setWeekdayScope}
              />
            </View>
            <WeekdayBarChart data={weekdayRates} />
          </Card>

          {bestRoutine && worstRoutine ? (
            <Card style={styles.cardGap}>
              <SectionHeader title="Melhor rotina e pior rotina" subtitle="Percentual no mes atual" />
              <RoutineSummaryRow label="Melhor rotina" item={bestRoutine} />
              <RoutineSummaryRow label="Pior rotina" item={worstRoutine} />
            </Card>
          ) : null}

          <Card style={styles.cardGap}>
            <View style={styles.sectionTop}>
              <SectionHeader title="Evolucao" subtitle={evolutionMode === 'month' ? 'Mes atual' : `${referenceDate.getFullYear()}`} />
              <SegmentedControl
                value={evolutionMode}
                options={[
                  { value: 'month', label: 'Mensal' },
                  { value: 'year', label: 'Anual' },
                ]}
                onChange={setEvolutionMode}
              />
            </View>
            {evolutionMode === 'month' ? <MonthlyLineChart data={monthLineData} /> : <YearlyLineChart data={yearLineData} />}
          </Card>

          <Card style={styles.cardGap}>
            <SectionHeader title="Progresso por rotina" subtitle="Mes atual" />
            <View style={styles.routineList}>
              {routineProgress.length === 0 ? (
                <Text style={styles.emptyText}>Sem rotinas previstas neste mes.</Text>
              ) : (
                routineProgress.map((item) => <RoutineProgressRow key={item.routine.id} item={item} />)
              )}
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}

function getWeekdayScopeLabel(scope: WeekdayScope) {
  if (scope === 'month') {
    return 'Mes atual';
  }

  if (scope === 'last90') {
    return 'Ultimos 90 dias';
  }

  return 'Historico';
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable key={option.value} onPress={() => onChange(option.value)} style={[styles.segmentButton, selected && styles.segmentButtonActive]}>
            <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function WeekdayBarChart({ data }: { data: Array<{ label: string; percentage: number; completed: number; planned: number }> }) {
  return (
    <View style={styles.weekdayList}>
      {data.map((item) => (
        <View key={item.label} style={styles.weekdayRow}>
          <Text style={styles.weekdayLabel}>{item.label}</Text>
          <View style={styles.weekdayTrack}>
            <View style={[styles.weekdayFill, { width: `${item.percentage}%`, backgroundColor: getPerformanceColor(item.percentage) }]} />
          </View>
          <Text style={styles.weekdayValue}>{item.planned > 0 ? `${item.percentage}%` : '-'}</Text>
        </View>
      ))}
    </View>
  );
}

function getPerformanceColor(percentage: number) {
  if (percentage >= 85) {
    return colors.success;
  }

  if (percentage >= 60) {
    return '#84CC16';
  }

  if (percentage >= 35) {
    return colors.warning;
  }

  return colors.danger;
}

function RoutineSummaryRow({ label, item }: { label: string; item: RoutineProgress }) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryCopy}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryName} numberOfLines={1}>
          {item.routine.name}
        </Text>
      </View>
      <Text style={styles.summaryValue}>{item.percentage}%</Text>
    </View>
  );
}

function RoutineProgressRow({ item }: { item: RoutineProgress }) {
  const accent = getRoutineColor(item.routine.color);

  return (
    <View style={styles.routineRow}>
      <View style={styles.routineHeader}>
        <Text style={styles.routineName} numberOfLines={1}>
          {item.routine.name}
        </Text>
        <Text style={styles.routinePercent}>{item.percentage}%</Text>
      </View>
      <ProgressBar value={item.percentage} height={7} color={accent} />
      <Text style={styles.routineDetail}>
        {item.completed} de {item.goal} dias previstos
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
    paddingBottom: 116,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
  },
  cardGap: {
    gap: spacing.md,
  },
  sectionTop: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },
  primaryValue: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '800',
  },
  todayCard: {
    gap: spacing.xs,
  },
  todayText: {
    color: colors.textMuted,
    fontSize: typography.body,
    fontWeight: '600',
  },
  segmented: {
    backgroundColor: 'rgba(161, 161, 170, 0.08)',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 3,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flex: 1,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.surfaceStrong,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.text,
  },
  weekdayList: {
    gap: spacing.sm,
  },
  weekdayRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 28,
  },
  weekdayLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
    width: 34,
  },
  weekdayTrack: {
    backgroundColor: 'rgba(161, 161, 170, 0.14)',
    borderRadius: 999,
    flex: 1,
    height: 8,
    overflow: 'hidden',
  },
  weekdayFill: {
    borderRadius: 999,
    height: '100%',
  },
  weekdayValue: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '800',
    minWidth: 38,
    textAlign: 'right',
  },
  summaryRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(161, 161, 170, 0.07)',
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  summaryValue: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '800',
  },
  routineList: {
    gap: spacing.lg,
  },
  routineRow: {
    gap: spacing.sm,
  },
  routineHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  routineName: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: '800',
  },
  routinePercent: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '800',
  },
  routineDetail: {
    color: colors.textSubtle,
    fontSize: typography.tiny,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
});
