import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { CalendarCheck, Flame, ListChecks, PlusCircle, Sparkles, Zap } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { MetricCard } from '../../components/MetricCard';
import { MiniBarChart } from '../../components/MiniBarChart';
import { ProgressBar } from '../../components/ProgressBar';
import { RoutineCheckRow } from '../../components/RoutineCheckRow';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { getLogsByDate, getLogsForRange, getRoutines, toggleRoutineCompletion } from '../../database';
import { colors, spacing, typography } from '../../theme';
import type { Routine, RoutineLog } from '../../types';
import { addDays, dateToKey, formatReadableDate, getGreeting, getLastNDays, todayKey } from '../../utils/date';
import { calculateCompleteRoutineStreak } from '../../utils/metrics';

export function DashboardScreen() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [todayLogs, setTodayLogs] = useState<RoutineLog[]>([]);
  const [streakLogs, setStreakLogs] = useState<RoutineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const completionAnim = useRef(new Animated.Value(0)).current;

  const loadDashboard = useCallback(async () => {
    const today = todayKey();
    const streakStart = dateToKey(addDays(new Date(), -90));

    setLoading(true);
    const [activeRoutines, logsToday, logsForStreak] = await Promise.all([
      getRoutines(false),
      getLogsByDate(today),
      getLogsForRange(streakStart, today),
    ]);

    setRoutines(activeRoutines);
    setTodayLogs(logsToday);
    setStreakLogs(logsForStreak);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  const checkedIds = useMemo(
    () => new Set(todayLogs.filter((log) => log.completed === 1).map((log) => log.routine_id)),
    [todayLogs],
  );
  const completedToday = checkedIds.size;
  const dailyProgress = routines.length > 0 ? Math.round((completedToday / routines.length) * 100) : 0;
  const allDoneToday = routines.length > 0 && completedToday === routines.length;
  const streak = useMemo(() => calculateCompleteRoutineStreak(routines, streakLogs), [routines, streakLogs]);
  const weeklyData = useMemo(() => {
    const days = getLastNDays(7);

    return days.map((day) => ({
      label: day.label,
      value: streakLogs.filter((log) => log.date === day.key && log.completed === 1).length,
    }));
  }, [streakLogs]);

  useEffect(() => {
    Animated.spring(completionAnim, {
      toValue: allDoneToday ? 1 : 0,
      friction: 7,
      tension: 85,
      useNativeDriver: true,
    }).start();
  }, [allDoneToday, completionAnim]);

  async function handleToggle(routineId: string) {
    await toggleRoutineCompletion(routineId);
    await loadDashboard();
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.title}>Painel de rotina</Text>
        <Text style={styles.subtitle}>{formatReadableDate(todayKey())}</Text>
      </View>

      <Animated.View
        style={{
          transform: [
            {
              scale: completionAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.02],
              }),
            },
          ],
        }}
      >
        <Card style={[styles.progressCard, allDoneToday && styles.progressCardComplete]}>
        <View style={styles.progressTop}>
          <View>
            <Text style={styles.cardLabel}>Progresso de hoje</Text>
            <Text style={styles.progressValue}>{dailyProgress}%</Text>
          </View>
          <View style={styles.trendIcon}>
            <Zap color={colors.secondary} size={25} strokeWidth={2.4} />
          </View>
        </View>
        <ProgressBar value={dailyProgress} />
        <Text style={styles.progressDetail}>
          {completedToday} de {routines.length} rotinas concluidas hoje
        </Text>
        {allDoneToday ? (
          <Animated.View
            style={[
              styles.doneBanner,
              {
                opacity: completionAnim,
                transform: [
                  {
                    translateY: completionAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Sparkles color={colors.white} size={18} strokeWidth={2.4} />
            <Text style={styles.doneBannerText}>Dia fechado. Todas as rotinas foram concluidas.</Text>
          </Animated.View>
        ) : null}
        </Card>
      </Animated.View>

      <View style={styles.metricRow}>
        <MetricCard label="Streak atual" value={`${streak}d`} detail="Dias seguidos" icon={Flame} accent={colors.warning} />
        <MetricCard
          label="Hoje"
          value={`${completedToday}/${routines.length}`}
          detail="Rotinas feitas"
          icon={CalendarCheck}
          accent={colors.success}
        />
      </View>

      <View style={styles.sectionBlock}>
        <SectionHeader title="Rotinas de hoje" subtitle={loading ? 'Carregando...' : `${routines.length} ativas`} />
        {routines.length === 0 ? (
          <EmptyState
            icon={PlusCircle}
            title="Nenhuma rotina ativa"
            subtitle="Crie sua primeira rotina na aba Rotinas para acompanhar seu dia."
          />
        ) : (
          <View style={styles.list}>
            {routines.map((routine) => (
              <RoutineCheckRow
                key={routine.id}
                routine={routine}
                checked={checkedIds.has(routine.id)}
                onToggle={() => handleToggle(routine.id)}
              />
            ))}
          </View>
        )}
      </View>

      <Card>
        <SectionHeader title="Resumo semanal" subtitle="Conclusoes por dia" />
        {routines.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Sem dados para exibir"
            subtitle="Os graficos aparecem conforme voce marca suas rotinas."
          />
        ) : (
          <MiniBarChart data={weeklyData} maxValue={Math.max(routines.length, 1)} />
        )}
      </Card>
    </Screen>
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
  greeting: {
    color: colors.secondary,
    fontSize: typography.small,
    fontWeight: '800',
    textTransform: 'uppercase',
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
  progressCard: {
    gap: spacing.md,
  },
  progressCardComplete: {
    borderColor: 'rgba(49, 208, 138, 0.56)',
  },
  progressTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  progressValue: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  progressDetail: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  doneBanner: {
    alignItems: 'center',
    backgroundColor: 'rgba(49, 208, 138, 0.22)',
    borderColor: 'rgba(49, 208, 138, 0.46)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  doneBannerText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.small,
    fontWeight: '800',
  },
  trendIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(38, 217, 255, 0.13)',
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sectionBlock: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
});
