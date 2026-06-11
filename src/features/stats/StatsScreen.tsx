import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { BarChart3 } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { getAllStudySessions, getPlannedItemsForDate } from '../../database';
import { colors, radii, spacing, typography } from '../../theme';
import type { PlannedActivityItem, StudySession } from '../../types';
import { addDays, dateToKey, parseDateKey, todayKey } from '../../utils/date';
import { getRoutineColor } from '../../utils/routineVisuals';

type Summary = {
  planned: number;
  completed: number;
  notDone: number;
  percentage: number;
};

type WeekdayRate = {
  label: string;
  planned: number;
  completed: number;
  percentage: number;
};

type RoutineProgress = {
  id: string;
  name: string;
  color: string | null;
  planned: number;
  completed: number;
  percentage: number;
};

type StudyByActivity = {
  name: string;
  seconds: number;
};

type StatsData = {
  today: Summary;
  week: Summary;
  month: Summary;
  weekdayRates: WeekdayRate[];
  routineProgress: RoutineProgress[];
  studyTodaySeconds: number;
  studyWeekSeconds: number;
  studyMonthSeconds: number;
  studyByActivity: StudyByActivity[];
  focus: {
    completedSessions: number;
    totalSeconds: number;
    focusBreaks: number;
    averageSeconds: number;
  };
};

const WEEKDAY_LABELS = [
  { jsDay: 1, label: 'Seg' },
  { jsDay: 2, label: 'Ter' },
  { jsDay: 3, label: 'Qua' },
  { jsDay: 4, label: 'Qui' },
  { jsDay: 5, label: 'Sex' },
  { jsDay: 6, label: 'Sab' },
  { jsDay: 0, label: 'Dom' },
];

export function StatsScreen() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);

    try {
      setStats(await buildStatsData());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  const hasAnyData = stats ? stats.month.planned > 0 || stats.focus.totalSeconds > 0 : false;

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Estatisticas</Text>
        <Text style={styles.subtitle}>Cumprimento do QTS e estudo</Text>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.secondary} />
          <Text style={styles.loadingText}>Calculando estatisticas</Text>
        </View>
      ) : !stats || !hasAnyData ? (
        <EmptyState icon={BarChart3} title="Sem dados" subtitle="As estatisticas aparecem quando houver rotinas planejadas ou sessoes de estudo." />
      ) : (
        <>
          <View style={styles.summaryGrid}>
            <SummaryCard title="Hoje" summary={stats.today} />
            <SummaryCard title="Semana" summary={stats.week} />
            <SummaryCard title="Mes" summary={stats.month} />
          </View>

          <Card style={styles.cardGap}>
            <SectionHeader title="Desempenho por dia da semana" subtitle="Ultimos 90 dias" />
            <View style={styles.weekdayList}>
              {stats.weekdayRates.map((item) => (
                <View key={item.label} style={styles.weekdayRow}>
                  <Text style={styles.weekdayLabel}>{item.label}</Text>
                  <View style={styles.weekdayTrack}>
                    <View style={[styles.weekdayFill, { width: `${item.percentage}%`, backgroundColor: getPerformanceColor(item.percentage) }]} />
                  </View>
                  <Text style={styles.weekdayValue}>{item.planned > 0 ? `${item.percentage}%` : '-'}</Text>
                </View>
              ))}
            </View>
          </Card>

          <Card style={styles.cardGap}>
            <SectionHeader title="Tempo de estudo" subtitle="Sessoes finalizadas" />
            <View style={styles.studyGrid}>
              <StudyMetric label="Hoje" seconds={stats.studyTodaySeconds} />
              <StudyMetric label="7 dias" seconds={stats.studyWeekSeconds} />
              <StudyMetric label="Mes" seconds={stats.studyMonthSeconds} />
            </View>
          </Card>

          <Card style={styles.cardGap}>
            <SectionHeader title="Tempo por atividade" subtitle="Mes atual" />
            {stats.studyByActivity.length === 0 ? (
              <Text style={styles.emptyText}>Sem estudo registrado neste mes.</Text>
            ) : (
              <>
                {stats.studyByActivity.length >= 2 ? (
                  <View style={styles.rankingGrid}>
                    <FocusMetric label="Mais estudada" value={stats.studyByActivity[0].name} />
                    <FocusMetric label="Menos estudada" value={stats.studyByActivity[stats.studyByActivity.length - 1].name} />
                  </View>
                ) : null}
                <View style={styles.list}>
                  {stats.studyByActivity.map((item) => (
                    <View key={item.name} style={styles.studyRow}>
                      <Text style={styles.studyName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.studyValue}>{formatDuration(item.seconds)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Card>

          <Card style={styles.cardGap}>
            <SectionHeader title="Progresso por rotina" subtitle="Mes atual ate hoje" />
            {stats.routineProgress.length === 0 ? (
              <Text style={styles.emptyText}>Sem rotinas previstas neste mes.</Text>
            ) : (
              <View style={styles.list}>
                {stats.routineProgress.map((item) => (
                  <View key={item.id} style={styles.routineRow}>
                    <View style={styles.routineTop}>
                      <Text style={styles.routineName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.routinePercent}>{item.percentage}%</Text>
                    </View>
                    <ProgressBar value={item.percentage} height={7} color={getRoutineColor(item.color)} />
                    <Text style={styles.routineDetail}>{item.completed} de {item.planned} previstos</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <Card style={styles.cardGap}>
            <SectionHeader title="Foco" subtitle="Historico de estudo" />
            <View style={styles.focusGrid}>
              <FocusMetric label="Sessoes" value={String(stats.focus.completedSessions)} />
              <FocusMetric label="Tempo total" value={formatDuration(stats.focus.totalSeconds)} />
              <FocusMetric label="Quebras" value={String(stats.focus.focusBreaks)} />
              <FocusMetric label="Media" value={formatDuration(stats.focus.averageSeconds)} />
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}

async function buildStatsData(): Promise<StatsData> {
  const reference = new Date();
  const today = todayKey();
  const weekKeys = getWeekToDateKeys(reference);
  const monthKeys = getMonthToDateKeys(reference);
  const last90Keys = getDateRangeKeys(addDays(reference, -89), reference);
  const cache = new Map<string, PlannedActivityItem[]>();

  async function getItems(keys: string[]) {
    const missingKeys = keys.filter((key) => !cache.has(key));
    const missingItems = await Promise.all(missingKeys.map((key) => getPlannedItemsForDate(key)));

    missingKeys.forEach((key, index) => cache.set(key, missingItems[index]));

    return keys.map((key) => cache.get(key) ?? []);
  }

  const [todayItems, weekItems, monthItems, last90Items, sessions] = await Promise.all([
    getItems([today]),
    getItems(weekKeys),
    getItems(monthKeys),
    getItems(last90Keys),
    getAllStudySessions(),
  ]);

  const weekStart = weekKeys[0];
  const monthStart = monthKeys[0];

  return {
    today: summarizeItems(todayItems),
    week: summarizeItems(weekItems),
    month: summarizeItems(monthItems),
    weekdayRates: buildWeekdayRates(last90Keys, last90Items),
    routineProgress: buildRoutineProgress(monthItems),
    studyTodaySeconds: sumStudySeconds(sessions, today, today),
    studyWeekSeconds: sumStudySeconds(sessions, weekStart, today),
    studyMonthSeconds: sumStudySeconds(sessions, monthStart, today),
    studyByActivity: buildStudyByActivity(sessions, monthStart, today),
    focus: buildFocusStats(sessions),
  };
}

function summarizeItems(days: PlannedActivityItem[][]): Summary {
  const planned = days.reduce((sum, items) => sum + items.length, 0);
  const completed = days.reduce((sum, items) => sum + items.filter((item) => item.status === 'done').length, 0);
  const notDone = Math.max(0, planned - completed);

  return {
    planned,
    completed,
    notDone,
    percentage: planned > 0 ? Math.round((completed / planned) * 100) : 0,
  };
}

function buildWeekdayRates(keys: string[], days: PlannedActivityItem[][]): WeekdayRate[] {
  const grouped = new Map<number, { planned: number; completed: number }>();

  for (const weekday of WEEKDAY_LABELS) {
    grouped.set(weekday.jsDay, { planned: 0, completed: 0 });
  }

  keys.forEach((key, index) => {
    const weekday = parseDateKey(key).getDay();
    const group = grouped.get(weekday);

    if (!group) {
      return;
    }

    group.planned += days[index].length;
    group.completed += days[index].filter((item) => item.status === 'done').length;
  });

  return WEEKDAY_LABELS.map((weekday) => {
    const group = grouped.get(weekday.jsDay) ?? { planned: 0, completed: 0 };

    return {
      label: weekday.label,
      planned: group.planned,
      completed: group.completed,
      percentage: group.planned > 0 ? Math.round((group.completed / group.planned) * 100) : 0,
    };
  });
}

function buildRoutineProgress(days: PlannedActivityItem[][]): RoutineProgress[] {
  const grouped = new Map<string, RoutineProgress>();

  for (const items of days) {
    for (const item of items) {
      const current =
        grouped.get(item.activity.id) ??
        {
          id: item.activity.id,
          name: item.activity.name,
          color: item.activity.color,
          planned: 0,
          completed: 0,
          percentage: 0,
        };

      current.planned += 1;
      current.completed += item.status === 'done' ? 1 : 0;
      current.percentage = current.planned > 0 ? Math.round((current.completed / current.planned) * 100) : 0;
      grouped.set(item.activity.id, current);
    }
  }

  return [...grouped.values()].sort((a, b) => b.percentage - a.percentage || a.name.localeCompare(b.name));
}

function buildStudyByActivity(sessions: StudySession[], startDate: string, endDate: string): StudyByActivity[] {
  const grouped = new Map<string, number>();

  for (const session of sessions) {
    const key = dateToKey(new Date(session.started_at));

    if (key < startDate || key > endDate) {
      continue;
    }

    grouped.set(session.activity_name_snapshot, (grouped.get(session.activity_name_snapshot) ?? 0) + session.actual_study_seconds);
  }

  return [...grouped.entries()]
    .map(([name, seconds]) => ({ name, seconds }))
    .sort((a, b) => b.seconds - a.seconds);
}

function buildFocusStats(sessions: StudySession[]) {
  const completedSessions = sessions.filter((session) => session.completed === 1).length;
  const totalSeconds = sessions.reduce((sum, session) => sum + session.actual_study_seconds, 0);
  const focusBreaks = sessions.reduce((sum, session) => sum + session.focus_breaks_count, 0);

  return {
    completedSessions,
    totalSeconds,
    focusBreaks,
    averageSeconds: sessions.length > 0 ? Math.round(totalSeconds / sessions.length) : 0,
  };
}

function sumStudySeconds(sessions: StudySession[], startDate: string, endDate: string) {
  return sessions.reduce((sum, session) => {
    const key = dateToKey(new Date(session.started_at));

    return key >= startDate && key <= endDate ? sum + session.actual_study_seconds : sum;
  }, 0);
}

function getWeekToDateKeys(reference: Date) {
  const day = reference.getDay();
  const daysSinceMonday = (day + 6) % 7;

  return getDateRangeKeys(addDays(reference, -daysSinceMonday), reference);
}

function getMonthToDateKeys(reference: Date) {
  return getDateRangeKeys(new Date(reference.getFullYear(), reference.getMonth(), 1), reference);
}

function getDateRangeKeys(startDate: Date, endDate: Date) {
  const keys: string[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  while (cursor <= end) {
    keys.push(dateToKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
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

function SummaryCard({ title, summary }: { title: string; summary: Summary }) {
  return (
    <Card style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={styles.summaryValue}>{summary.percentage}%</Text>
      <ProgressBar value={summary.percentage} height={7} />
      <Text style={styles.summaryDetail}>{summary.completed} de {summary.planned} previstos</Text>
    </Card>
  );
}

function StudyMetric({ label, seconds }: { label: string; seconds: number }) {
  return (
    <View style={styles.studyMetric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{formatDuration(seconds)}</Text>
    </View>
  );
}

function FocusMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.focusMetric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}min`;
  }

  return `${hours}h ${String(minutes).padStart(2, '0')}min`;
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
  loading: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  summaryGrid: {
    gap: spacing.md,
  },
  summaryCard: {
    gap: spacing.sm,
  },
  summaryTitle: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
  },
  summaryDetail: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  cardGap: {
    gap: spacing.md,
  },
  weekdayList: {
    gap: spacing.sm,
  },
  weekdayRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 30,
  },
  weekdayLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '800',
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
    fontWeight: '900',
    minWidth: 38,
    textAlign: 'right',
  },
  studyGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  studyMetric: {
    flex: 1,
    borderRadius: radii.md,
    backgroundColor: 'rgba(161, 161, 170, 0.07)',
    padding: spacing.md,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  list: {
    gap: spacing.md,
  },
  studyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  studyName: {
    color: colors.text,
    flex: 1,
    fontSize: typography.small,
    fontWeight: '800',
  },
  studyValue: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '900',
  },
  routineRow: {
    gap: spacing.sm,
  },
  routineTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  routineName: {
    color: colors.text,
    flex: 1,
    fontSize: typography.small,
    fontWeight: '800',
  },
  routinePercent: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '900',
  },
  routineDetail: {
    color: colors.textSubtle,
    fontSize: typography.tiny,
    fontWeight: '700',
  },
  focusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rankingGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  focusMetric: {
    width: '48%',
    borderRadius: radii.md,
    backgroundColor: 'rgba(161, 161, 170, 0.07)',
    padding: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
  },
});
