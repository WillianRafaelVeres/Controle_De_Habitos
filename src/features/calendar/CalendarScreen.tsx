import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CircleMinus } from 'lucide-react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { getLogsForRange, getRoutines } from '../../database';
import { colors, radii, spacing, typography } from '../../theme';
import type { Routine, RoutineLog } from '../../types';
import {
  calculateDailyPercentage,
  dateToKey,
  formatMonthTitle,
  formatReadableDate,
  getCalendarGrid,
  getMonthRange,
  getMonthStart,
  getWeekdayLabels,
  nextMonth,
  previousMonth,
  todayKey,
} from '../../utils/date';
import { getRoutineColor, getRoutineIcon } from '../../utils/routineVisuals';

export function CalendarScreen() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [monthDate, setMonthDate] = useState(() => getMonthStart(new Date()));

  const loadCalendar = useCallback(async () => {
    const range = getMonthRange(monthDate);
    const [activeRoutines, monthLogs] = await Promise.all([getRoutines(false), getLogsForRange(range.start, range.end)]);

    setRoutines(activeRoutines);
    setLogs(monthLogs);
  }, [monthDate]);

  useFocusEffect(
    useCallback(() => {
      loadCalendar();
    }, [loadCalendar]),
  );

  const cells = useMemo(() => getCalendarGrid(monthDate), [monthDate]);
  const completedIdsForSelectedDate = useMemo(
    () =>
      new Set(
        logs
          .filter((log) => log.date === selectedDate && log.completed === 1)
          .map((log) => log.routine_id),
      ),
    [logs, selectedDate],
  );
  const selectedProgress = useMemo(
    () => calculateDailyPercentage(selectedDate, routines, logs),
    [logs, routines, selectedDate],
  );
  const selectedCompleted = useMemo(
    () => routines.filter((routine) => completedIdsForSelectedDate.has(routine.id)),
    [completedIdsForSelectedDate, routines],
  );
  const selectedPending = useMemo(
    () => routines.filter((routine) => !completedIdsForSelectedDate.has(routine.id)),
    [completedIdsForSelectedDate, routines],
  );

  function changeMonth(nextDate: Date) {
    const firstDay = getMonthStart(nextDate);
    setMonthDate(firstDay);
    setSelectedDate(dateToKey(firstDay));
  }

  function goToToday() {
    const today = new Date();
    setMonthDate(getMonthStart(today));
    setSelectedDate(todayKey());
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendario</Text>
        <Text style={styles.subtitle}>Percentual diario de conclusao</Text>
      </View>

      <View style={styles.periodSelector}>
        <IconButton onPress={() => changeMonth(previousMonth(monthDate))} icon={ChevronLeft} />
        <Text style={styles.periodLabel}>{formatMonthTitle(monthDate)}</Text>
        <IconButton onPress={() => changeMonth(nextMonth(monthDate))} icon={ChevronRight} />
        <Pressable onPress={goToToday} style={styles.todayButton}>
          <Text style={styles.todayText}>Hoje</Text>
        </Pressable>
      </View>

      <Card style={styles.calendarCard}>
        <View style={styles.weekdays}>
          {getWeekdayLabels().map((label, index) => (
            <Text key={`${label}-${index}`} style={styles.weekday}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((cell, index) => {
            if (!cell) {
              return <View key={`blank-${index}`} style={styles.daySlot} />;
            }

            const progress = calculateDailyPercentage(cell.key, routines, logs);
            const selected = cell.key === selectedDate;

            return (
              <View key={cell.key} style={styles.daySlot}>
                <Pressable onPress={() => setSelectedDate(cell.key)} style={[styles.dayButton, selected && styles.daySelected]}>
                  <DayProgressCircle day={cell.day} percentage={progress.percentage} isToday={cell.isToday} />
                </Pressable>
              </View>
            );
          })}
        </View>
      </Card>

      <Card style={styles.detailCard}>
        <SectionHeader title={formatReadableDate(selectedDate)} subtitle={`${selectedProgress.percentage}% concluido`} />
        {routines.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Nenhuma rotina ativa" subtitle="Ative ou cadastre rotinas para acompanhar o calendario." />
        ) : (
          <>
            <View style={styles.detailSummary}>
              <Text style={styles.detailPercent}>{selectedProgress.percentage}%</Text>
              <Text style={styles.detailText}>
                {selectedProgress.completed} de {selectedProgress.total} rotinas concluidas
              </Text>
            </View>

            <RoutineSection title="Concluidas" emptyText="Nenhuma rotina concluida neste dia." routines={selectedCompleted} done />
            <RoutineSection title="Pendentes" emptyText="Nada pendente neste dia." routines={selectedPending} />
          </>
        )}
      </Card>
    </Screen>
  );
}

function DayProgressCircle({ day, percentage, isToday }: { day: number; percentage: number; isToday: boolean }) {
  const size = 46;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;
  const accent = percentage >= 100 ? colors.success : percentage > 0 ? colors.secondary : colors.textSubtle;

  return (
    <View style={styles.circleShell}>
      <Svg width={size} height={size} style={styles.progressRing}>
        <SvgCircle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(148, 163, 184, 0.16)" strokeWidth={strokeWidth} fill="none" />
        <SvgCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={accent}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={[styles.dayText, isToday && styles.todayDayText]}>{day}</Text>
      <Text style={[styles.percentText, { color: accent }]}>{percentage}%</Text>
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

function RoutineSection({
  title,
  emptyText,
  routines,
  done = false,
}: {
  title: string;
  emptyText: string;
  routines: Routine[];
  done?: boolean;
}) {
  return (
    <View style={styles.routineSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {routines.length === 0 ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : (
        <View style={styles.doneList}>
          {routines.map((routine) => (
            <CalendarRoutineRow key={routine.id} routine={routine} done={done} />
          ))}
        </View>
      )}
    </View>
  );
}

function CalendarRoutineRow({ routine, done }: { routine: Routine; done: boolean }) {
  const accent = getRoutineColor(routine.color);
  const Icon = getRoutineIcon(routine.icon);

  return (
    <View style={styles.doneRow}>
      <View style={[styles.doneIcon, { backgroundColor: `${accent}20` }]}>
        <Icon color={accent} size={18} strokeWidth={2.4} />
      </View>
      <View style={styles.doneCopy}>
        <Text style={styles.doneName} numberOfLines={1}>
          {routine.name}
        </Text>
        <Text style={styles.doneMeta} numberOfLines={1}>
          {routine.category || 'Rotina diaria'}
        </Text>
      </View>
      {done ? <CheckCircle2 color={colors.success} size={20} strokeWidth={2.4} /> : <CircleMinus color={colors.textSubtle} size={20} strokeWidth={2.4} />}
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
  calendarCard: {
    gap: spacing.md,
  },
  weekdays: {
    flexDirection: 'row',
  },
  weekday: {
    width: `${100 / 7}%`,
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: '900',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  daySlot: {
    width: `${100 / 7}%`,
    padding: 3,
  },
  dayButton: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(8, 13, 31, 0.55)',
  },
  daySelected: {
    borderColor: colors.secondary,
    borderWidth: 2,
  },
  circleShell: {
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  progressRing: {
    position: 'absolute',
  },
  dayText: {
    color: colors.text,
    fontSize: typography.tiny,
    fontWeight: '900',
    lineHeight: 13,
  },
  todayDayText: {
    color: colors.secondary,
  },
  percentText: {
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },
  detailCard: {
    gap: spacing.md,
  },
  detailSummary: {
    alignItems: 'center',
    backgroundColor: 'rgba(38, 217, 255, 0.1)',
    borderColor: 'rgba(38, 217, 255, 0.24)',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  detailPercent: {
    color: colors.secondary,
    fontSize: 34,
    fontWeight: '900',
  },
  detailText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: '800',
  },
  routineSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  doneList: {
    gap: spacing.md,
  },
  doneRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 58,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
  },
  doneIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  doneCopy: {
    flex: 1,
    minWidth: 0,
  },
  doneName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
  },
  doneMeta: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: spacing.xs,
  },
});
