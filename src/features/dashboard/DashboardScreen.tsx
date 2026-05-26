import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlusCircle } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ProgressBar } from '../../components/ProgressBar';
import { RoutineCheckRow } from '../../components/RoutineCheckRow';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { getLogsByDate, getRoutines, toggleRoutineCompletion } from '../../database';
import { colors, spacing, typography } from '../../theme';
import type { Routine, RoutineLog } from '../../types';
import { formatReadableDate, todayKey } from '../../utils/date';

export function DashboardScreen() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [todayLogs, setTodayLogs] = useState<RoutineLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    const today = todayKey();

    setLoading(true);
    const [activeRoutines, logsToday] = await Promise.all([
      getRoutines(false),
      getLogsByDate(today),
    ]);

    setRoutines(activeRoutines);
    setTodayLogs(logsToday);
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

  async function handleToggle(routineId: string) {
    await toggleRoutineCompletion(routineId);
    await loadDashboard();
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Inicio</Text>
        <Text style={styles.subtitle}>{formatReadableDate(todayKey())}</Text>
      </View>

      <Card style={styles.progressCard}>
        <View style={styles.progressTop}>
          <View>
            <Text style={styles.cardLabel}>Hoje</Text>
            <Text style={styles.progressValue}>{dailyProgress}%</Text>
          </View>
          <Text style={styles.progressSummary}>{completedToday}/{routines.length}</Text>
        </View>
        <ProgressBar value={dailyProgress} height={8} />
        <Text style={styles.progressDetail}>
          {completedToday} de {routines.length} rotinas concluidas
        </Text>
      </Card>

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
    fontSize: 40,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  progressSummary: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '800',
  },
  progressDetail: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  sectionBlock: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
});
