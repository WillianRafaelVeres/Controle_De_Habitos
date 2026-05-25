import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  Award,
  BarChart3,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Flame,
  History,
  Percent,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { MetricCard } from '../../components/MetricCard';
import { MiniBarChart } from '../../components/MiniBarChart';
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
  calculateMonthlyAverage,
  dateToKey,
  formatMonthTitle,
  getMonthRange,
  getYearRange,
  nextMonth,
  nextYear,
  previousMonth,
  previousYear,
  todayKey,
} from '../../utils/date';
import {
  buildLastDaysCompletionTotals,
  buildMonthStats,
  buildMonthlyCompletionTotals,
  calculateBestCompleteRoutineStreak,
  calculateCompleteRoutineStreak,
  calculateCompletionRate,
  countCompletedLogs,
  getBestMonth,
  getBestWeekday,
} from '../../utils/metrics';
import { getRoutineColor, getRoutineIcon } from '../../utils/routineVisuals';

type WeekdayScope = 'month' | 'last30' | 'history';

export function StatsScreen() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [weekdayScope, setWeekdayScope] = useState<WeekdayScope>('month');

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

  const monthRange = useMemo(() => getMonthRange(selectedMonth), [selectedMonth]);
  const yearRange = useMemo(() => getYearRange(selectedYear), [selectedYear]);
  const monthLogs = useMemo(
    () => logs.filter((log) => log.date >= monthRange.start && log.date <= monthRange.end),
    [logs, monthRange.end, monthRange.start],
  );
  const yearLogs = useMemo(
    () => logs.filter((log) => log.date >= yearRange.start && log.date <= yearRange.end),
    [logs, yearRange.end, yearRange.start],
  );
  const last30Start = useMemo(() => dateToKey(addDays(new Date(), -29)), []);
  const last30Logs = useMemo(() => logs.filter((log) => log.date >= last30Start && log.date <= todayKey()), [last30Start, logs]);
  const stats = useMemo(() => buildMonthStats(routines, monthLogs, selectedMonth), [monthLogs, routines, selectedMonth]);
  const monthlyLineData = useMemo(() => buildDailyProgressForMonth(selectedMonth, routines, monthLogs), [monthLogs, routines, selectedMonth]);
  const yearlyLineData = useMemo(() => buildMonthlyProgressForYear(selectedYear, routines, yearLogs), [routines, selectedYear, yearLogs]);
  const monthlyAverage = useMemo(() => calculateMonthlyAverage(selectedMonth, routines, monthLogs), [monthLogs, routines, selectedMonth]);
  const monthCompletionRate = useMemo(
    () => calculateCompletionRate(routines, logs, monthRange.start, monthRange.end),
    [logs, monthRange.end, monthRange.start, routines],
  );
  const currentStreak = useMemo(() => calculateCompleteRoutineStreak(routines, logs), [logs, routines]);
  const bestStreak = useMemo(() => calculateBestCompleteRoutineStreak(routines, logs), [logs, routines]);
  const totalHistory = useMemo(() => countCompletedLogs(logs), [logs]);
  const totalLast30 = useMemo(() => countCompletedLogs(last30Logs), [last30Logs]);
  const currentActiveRoutines = useMemo(() => routines.filter((routine) => routine.is_active === 1 && !routine.archived_at), [routines]);
  const todayProgress = useMemo(() => calculateDailyPercentage(todayKey(), currentActiveRoutines, logs), [currentActiveRoutines, logs]);
  const weeklyData = useMemo(() => buildLastDaysCompletionTotals(logs, 7), [logs]);
  const totalLast7 = useMemo(() => weeklyData.reduce((sum, item) => sum + item.value, 0), [weeklyData]);
  const monthlyTotals = useMemo(() => buildMonthlyCompletionTotals(yearLogs), [yearLogs]);
  const bestMonth = useMemo(() => getBestMonth(logs), [logs]);
  const scopedWeekdayLogs = useMemo(() => {
    if (weekdayScope === 'month') {
      return monthLogs;
    }

    if (weekdayScope === 'last30') {
      return last30Logs;
    }

    return logs;
  }, [last30Logs, logs, monthLogs, weekdayScope]);
  const bestWeekday = useMemo(() => getBestWeekday(scopedWeekdayLogs), [scopedWeekdayLogs]);
  const maxCompleted = Math.max(...stats.routineProgress.map((item) => item.completed), 1);
  const hasAnyData = routines.length > 0 || totalHistory > 0;

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Estatisticas</Text>
        <Text style={styles.subtitle}>Metas, medias e evolucao de rotina</Text>
      </View>

      <PeriodSelector
        label={formatMonthTitle(selectedMonth)}
        onPrevious={() => setSelectedMonth((current) => previousMonth(current))}
        onNext={() => setSelectedMonth((current) => nextMonth(current))}
        onToday={() => setSelectedMonth(new Date())}
      />

      {!hasAnyData ? (
        <EmptyState
          icon={BarChart3}
          title="Sem dados historicos"
          subtitle="Cadastre rotinas e marque conclusoes para calcular progresso, medias e desempenho mensal."
        />
      ) : (
        <>
          <Card style={styles.overallCard}>
            <View style={styles.overallTop}>
              <View>
                <Text style={styles.cardLabel}>Taxa de cumprimento mensal</Text>
                <Text style={styles.overallValue}>{monthCompletionRate.percentage}%</Text>
              </View>
              <View style={styles.overallIcon}>
                <TrendingUp color={colors.secondary} size={26} strokeWidth={2.4} />
              </View>
            </View>
            <ProgressBar value={monthCompletionRate.percentage} />
            <Text style={styles.progressDetail}>
              {monthCompletionRate.completed} de {monthCompletionRate.expected} metas previstas no periodo
            </Text>
          </Card>

          <View style={styles.metricRow}>
            <MetricCard label="Hoje" value={`${todayProgress.completed}/${todayProgress.total}`} detail={`${todayProgress.percentage}% do dia`} icon={Target} accent={colors.secondary} />
            <MetricCard label="Mes selecionado" value={`${stats.totalCompleted}`} detail="Conclusoes" icon={CalendarCheck} accent={colors.success} />
          </View>

          <View style={styles.metricRow}>
            <MetricCard label="Sequencia atual" value={`${currentStreak}d`} detail="Dias completos" icon={Flame} accent={colors.warning} />
            <MetricCard label="Melhor sequencia" value={`${bestStreak}d`} detail="Historico" icon={Trophy} accent={colors.primary} />
          </View>

          <View style={styles.metricRow}>
            <MetricCard label="Ultimos 7 dias" value={`${totalLast7}`} detail="Conclusoes" icon={BarChart3} accent={colors.secondary} />
            <MetricCard label="Ultimos 30 dias" value={`${totalLast30}`} detail="Conclusoes" icon={History} accent={colors.success} />
          </View>

          <View style={styles.metricRow}>
            <MetricCard label="Media mensal" value={`${monthlyAverage}%`} detail="Dias com metas" icon={Percent} accent={colors.secondary} />
            <MetricCard label="Total historico" value={`${totalHistory}`} detail="Inclui arquivadas" icon={History} accent={colors.primary} />
          </View>

          <Card style={styles.cardGap}>
            <View style={styles.chartHeader}>
              <SectionHeader title="Melhores periodos" subtitle="Conclusoes por data registrada" />
              <ScopeSelector value={weekdayScope} onChange={setWeekdayScope} />
            </View>
            <View style={styles.highlightRow}>
              <InsightCard
                title="Melhor dia"
                value={bestWeekday?.label ?? '-'}
                detail={bestWeekday ? `${bestWeekday.total} conclusoes` : 'Sem dados'}
                icon={Award}
                accent={colors.warning}
              />
              <InsightCard
                title="Melhor mes"
                value={bestMonth?.label ?? '-'}
                detail={bestMonth ? `${bestMonth.total} conclusoes` : 'Sem dados'}
                icon={Trophy}
                accent={colors.primary}
              />
            </View>
          </Card>

          <Card style={styles.cardGap}>
            <SectionHeader title="Evolucao semanal" subtitle="Conclusoes nos ultimos 7 dias" />
            <MiniBarChart data={weeklyData} maxValue={Math.max(...weeklyData.map((item) => item.value), 1)} />
          </Card>

          <View style={styles.highlightRow}>
            <HighlightCard title="Melhor rotina" item={stats.bestRoutine} icon={Award} accent={colors.warning} />
            <HighlightCard title="Pior desempenho" item={stats.worstRoutine} icon={AlertTriangle} accent={colors.danger} />
          </View>

          <Card style={styles.cardGap}>
            <SectionHeader title="Linha mensal" subtitle="Percentual concluido dia a dia" />
            <MonthlyLineChart data={monthlyLineData} />
          </Card>

          <Card style={styles.cardGap}>
            <View style={styles.chartHeader}>
              <SectionHeader title="Linha anual" subtitle="Media diaria por mes" />
              <View style={styles.yearControls}>
                <IconButton onPress={() => setSelectedYear((year) => previousYear(year))} icon={ChevronLeft} />
                <Text style={styles.yearLabel}>{selectedYear}</Text>
                <IconButton onPress={() => setSelectedYear((year) => nextYear(year))} icon={ChevronRight} />
              </View>
            </View>
            <YearlyLineChart data={yearlyLineData} />
          </Card>

          <Card style={styles.cardGap}>
            <SectionHeader title="Evolucao mensal" subtitle={`Total de conclusoes em ${selectedYear}`} />
            <View style={styles.monthTotalsList}>
              {monthlyTotals.length === 0 ? (
                <Text style={styles.emptyText}>Sem conclusoes neste ano.</Text>
              ) : (
                monthlyTotals.map((item) => (
                  <View key={item.monthKey} style={styles.monthTotalRow}>
                    <Text style={styles.monthTotalLabel}>{item.label}</Text>
                    <Text style={styles.monthTotalValue}>{item.total}</Text>
                  </View>
                ))
              )}
            </View>
          </Card>

          <Card style={styles.cardGap}>
            <SectionHeader title="Progresso por rotina" subtitle="Meta calculada pelo periodo em que a rotina existia" />
            <View style={styles.progressList}>
              {stats.routineProgress.map((item) => (
                <RoutineProgressRow key={item.routine.id} item={item} />
              ))}
            </View>
          </Card>

          <Card style={styles.cardGap}>
            <SectionHeader title="Grafico de barras" subtitle="Conclusoes no mes por rotina" />
            <View style={styles.barList}>
              {stats.routineProgress.map((item) => (
                <View key={item.routine.id} style={styles.barRow}>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {item.routine.name}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(6, Math.round((item.completed / maxCompleted) * 100))}%`,
                          backgroundColor: getRoutineColor(item.routine.color),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barValue}>{item.completed}</Text>
                </View>
              ))}
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}

function PeriodSelector({
  label,
  onPrevious,
  onNext,
  onToday,
}: {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <View style={styles.periodSelector}>
      <IconButton onPress={onPrevious} icon={ChevronLeft} />
      <Text style={styles.periodLabel} numberOfLines={1}>
        {label}
      </Text>
      <IconButton onPress={onNext} icon={ChevronRight} />
      <Pressable onPress={onToday} style={styles.todayButton}>
        <Text style={styles.todayText}>Hoje</Text>
      </Pressable>
    </View>
  );
}

function IconButton({ onPress, icon: Icon }: { onPress: () => void; icon: typeof ChevronLeft }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Icon color={colors.text} size={19} strokeWidth={2.5} />
    </Pressable>
  );
}

function ScopeSelector({ value, onChange }: { value: WeekdayScope; onChange: (value: WeekdayScope) => void }) {
  const options: Array<{ value: WeekdayScope; label: string }> = [
    { value: 'month', label: 'Mes' },
    { value: 'last30', label: '30 dias' },
    { value: 'history', label: 'Historico' },
  ];

  return (
    <View style={styles.scopeRow}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.scopeButton, selected && styles.scopeButtonActive]}
          >
            <Text style={[styles.scopeText, selected && styles.scopeTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function InsightCard({
  title,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  detail: string;
  icon: typeof Award;
  accent: string;
}) {
  return (
    <Card style={styles.highlightCard}>
      <View style={[styles.highlightIcon, { backgroundColor: `${accent}20` }]}>
        <Icon color={accent} size={20} strokeWidth={2.4} />
      </View>
      <Text style={styles.highlightTitle}>{title}</Text>
      <Text style={styles.highlightName} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.highlightDetail}>{detail}</Text>
    </Card>
  );
}

function HighlightCard({
  title,
  item,
  icon: Icon,
  accent,
}: {
  title: string;
  item: RoutineProgress | null;
  icon: typeof Award;
  accent: string;
}) {
  return (
    <Card style={styles.highlightCard}>
      <View style={[styles.highlightIcon, { backgroundColor: `${accent}20` }]}>
        <Icon color={accent} size={20} strokeWidth={2.4} />
      </View>
      <Text style={styles.highlightTitle}>{title}</Text>
      <Text style={styles.highlightName} numberOfLines={1} adjustsFontSizeToFit>
        {item?.routine.name ?? '-'}
      </Text>
      <Text style={styles.highlightDetail}>{item ? `${item.percentage}% - ${item.completed}/${item.goal}` : 'Sem dados'}</Text>
    </Card>
  );
}

function RoutineProgressRow({ item }: { item: RoutineProgress }) {
  const accent = getRoutineColor(item.routine.color);
  const Icon = getRoutineIcon(item.routine.icon);

  return (
    <View style={styles.progressRow}>
      <View style={[styles.routineIcon, { backgroundColor: `${accent}20` }]}>
        <Icon color={accent} size={18} strokeWidth={2.4} />
      </View>
      <View style={styles.progressCopy}>
        <View style={styles.progressHeader}>
          <Text style={styles.routineName} numberOfLines={1}>
            {item.routine.name}
          </Text>
          <Text style={styles.percentage}>{item.percentage}%</Text>
        </View>
        <ProgressBar value={item.percentage} color={accent} />
        <Text style={styles.progressSmall}>
          Meta: {item.goalPercent}% ({item.goal} dias previstos) - {item.completed} concluidos
        </Text>
      </View>
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
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
  },
  periodSelector: {
    alignItems: 'center',
    backgroundColor: 'rgba(8, 13, 31, 0.72)',
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  periodLabel: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: '900',
    textAlign: 'center',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  pressed: {
    opacity: 0.76,
  },
  todayButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(38, 217, 255, 0.12)',
    borderColor: 'rgba(38, 217, 255, 0.3)',
    borderRadius: radii.md,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  todayText: {
    color: colors.secondary,
    fontSize: typography.small,
    fontWeight: '900',
  },
  overallCard: {
    gap: spacing.md,
  },
  overallTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  overallValue: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  overallIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: 'rgba(38, 217, 255, 0.13)',
  },
  progressDetail: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  highlightRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scopeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  scopeButtonActive: {
    backgroundColor: 'rgba(38, 217, 255, 0.14)',
    borderColor: 'rgba(38, 217, 255, 0.32)',
  },
  scopeText: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: '900',
  },
  scopeTextActive: {
    color: colors.secondary,
  },
  highlightCard: {
    flex: 1,
    minHeight: 146,
    gap: spacing.sm,
  },
  highlightIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  highlightTitle: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  highlightName: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  highlightDetail: {
    color: colors.textSubtle,
    fontSize: typography.small,
  },
  chartHeader: {
    gap: spacing.sm,
  },
  yearControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  yearLabel: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
    minWidth: 58,
    textAlign: 'center',
  },
  cardGap: {
    gap: spacing.md,
  },
  monthTotalsList: {
    gap: spacing.sm,
  },
  monthTotalRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderRadius: radii.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  monthTotalLabel: {
    color: colors.text,
    flex: 1,
    fontSize: typography.small,
    fontWeight: '800',
  },
  monthTotalValue: {
    color: colors.secondary,
    fontSize: typography.body,
    fontWeight: '900',
    minWidth: 34,
    textAlign: 'right',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  progressList: {
    gap: spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  routineIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  progressCopy: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  routineName: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: '800',
  },
  percentage: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '900',
  },
  progressSmall: {
    color: colors.textSubtle,
    fontSize: typography.tiny,
  },
  barList: {
    gap: spacing.md,
  },
  barRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 34,
  },
  barLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
    width: 94,
  },
  barTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(148, 163, 184, 0.16)',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  barValue: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '900',
    minWidth: 24,
    textAlign: 'right',
  },
});
