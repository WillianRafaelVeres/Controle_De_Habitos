import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CircleMinus } from 'lucide-react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { getAllRoutines, getLogsForRange, setRoutineCompletion } from '../../database';
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
  getRoutinesForDate,
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
    const [allRoutines, monthLogs] = await Promise.all([getAllRoutines(), getLogsForRange(range.start, range.end)]);

    setRoutines(allRoutines);
    setLogs(monthLogs);
  }, [monthDate]);

  useFocusEffect(
    useCallback(() => {
      loadCalendar();
    }, [loadCalendar]),
  );

  const cells = useMemo(() => getCalendarGrid(monthDate), [monthDate]);
  const logsForSelectedDate = useMemo(() => logs.filter((log) => log.date === selectedDate), [logs, selectedDate]);
  const selectedProgress = useMemo(
    () => calculateDailyPercentage(selectedDate, routines, logs),
    [logs, routines, selectedDate],
  );
  const selectedItems = useMemo(() => {
    const logsByRoutineId = new Map(logsForSelectedDate.map((log) => [log.routine_id, log]));

    return getRoutinesForDate(selectedDate, routines, logsForSelectedDate).map((routine) => {
      const log = logsByRoutineId.get(routine.id);
      const checked = log?.completed === 1;

      return {
        routine,
        checked,
        displayName: checked && log?.routine_name_snapshot ? log.routine_name_snapshot : routine.name,
      };
    });
  }, [logsForSelectedDate, routines, selectedDate]);
  const selectedCompleted = useMemo(() => selectedItems.filter((item) => item.checked), [selectedItems]);
  const selectedPending = useMemo(() => selectedItems.filter((item) => !item.checked), [selectedItems]);
  const selectedIsFuture = selectedDate > todayKey();

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

  async function handleToggleRoutine(routine: Routine, checked: boolean) {
    if (selectedIsFuture) {
      return;
    }

    await setRoutineCompletion(routine.id, selectedDate, !checked);
    await loadCalendar();
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
            const isFuture = cell.key > todayKey();
            const isPast = cell.key < todayKey();

            return (
              <View key={cell.key} style={styles.daySlot}>
                <Pressable onPress={() => setSelectedDate(cell.key)} style={[styles.dayButton, selected && styles.daySelected]}>
                  <DayProgressCircle
                    day={cell.day}
                    percentage={progress.percentage}
                    isToday={cell.isToday}
                    isFuture={isFuture}
                    isPast={isPast}
                    hasPlanned={progress.total > 0}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={styles.legend}>
          <LegendItem color={colors.danger} label="Baixo" />
          <LegendItem color="#FACC15" label="Parcial" />
          <LegendItem color={colors.success} label="Completo" />
        </View>
      </Card>

      <Card style={styles.detailCard}>
        <SectionHeader title={formatReadableDate(selectedDate)} subtitle={`${selectedProgress.percentage}% concluido`} />
        {selectedItems.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Nenhuma rotina neste dia" subtitle="Os registros aparecem conforme as rotinas existem no periodo selecionado." />
        ) : (
          <>
            <View style={styles.detailSummary}>
              <Text style={styles.detailPercent}>{selectedProgress.percentage}%</Text>
              <Text style={styles.detailText}>
                {selectedProgress.completed} de {selectedProgress.total} metas concluidas
              </Text>
            </View>

            <RoutineSection
              title="Concluidas"
              emptyText="Nenhuma rotina concluida neste dia."
              items={selectedCompleted}
              disabled={selectedIsFuture}
              onToggle={handleToggleRoutine}
            />
            <RoutineSection
              title="Pendentes"
              emptyText="Nada pendente neste dia."
              items={selectedPending}
              disabled={selectedIsFuture}
              onToggle={handleToggleRoutine}
            />
          </>
        )}
      </Card>
    </Screen>
  );
}

function DayProgressCircle({
  day,
  percentage,
  isToday,
  isFuture,
  isPast,
  hasPlanned,
}: {
  day: number;
  percentage: number;
  isToday: boolean;
  isFuture: boolean;
  isPast: boolean;
  hasPlanned: boolean;
}) {
  const size = 42;
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;
  const accent = getCalendarProgressColor(percentage, isFuture, isPast, hasPlanned);
  const trackColor = isPast && hasPlanned && percentage === 0 ? 'rgba(239, 68, 68, 0.42)' : 'rgba(161, 161, 170, 0.16)';
  const showProgress = hasPlanned && !isFuture && percentage > 0;

  return (
    <View style={styles.circleShell}>
      <Svg width={size} height={size} style={styles.progressRing}>
        <SvgCircle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        {showProgress ? (
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
        ) : null}
      </Svg>
      <Text style={[styles.dayText, { color: accent }, isToday && styles.todayDayText]}>{day}</Text>
    </View>
  );
}

function getCalendarProgressColor(percentage: number, isFuture: boolean, isPast: boolean, hasPlanned: boolean) {
  if (isFuture || !hasPlanned) {
    return colors.textSubtle;
  }

  if (percentage === 0) {
    return isPast ? colors.danger : colors.textMuted;
  }

  return getCompletionGradientColor(percentage);
}

function getCompletionGradientColor(percentage: number) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const red = { r: 239, g: 68, b: 68 };
  const yellow = { r: 250, g: 204, b: 21 };
  const green = { r: 34, g: 197, b: 94 };

  if (clamped <= 50) {
    return interpolateRgb(red, yellow, clamped / 50);
  }

  return interpolateRgb(yellow, green, (clamped - 50) / 50);
}

function interpolateRgb(
  start: { r: number; g: number; b: number },
  end: { r: number; g: number; b: number },
  amount: number,
) {
  const r = Math.round(start.r + (end.r - start.r) * amount);
  const g = Math.round(start.g + (end.g - start.g) * amount);
  const b = Math.round(start.b + (end.b - start.b) * amount);

  return `rgb(${r}, ${g}, ${b})`;
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
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
  items,
  disabled,
  onToggle,
}: {
  title: string;
  emptyText: string;
  items: Array<{ routine: Routine; checked: boolean; displayName: string }>;
  disabled: boolean;
  onToggle: (routine: Routine, checked: boolean) => void;
}) {
  return (
    <View style={styles.routineSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : (
        <View style={styles.doneList}>
          {items.map((item) => (
            <CalendarRoutineRow
              key={item.routine.id}
              item={item}
              disabled={disabled}
              onToggle={() => onToggle(item.routine, item.checked)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function CalendarRoutineRow({
  item,
  disabled,
  onToggle,
}: {
  item: { routine: Routine; checked: boolean; displayName: string };
  disabled: boolean;
  onToggle: () => void;
}) {
  const { routine, checked, displayName } = item;
  const accent = getRoutineColor(routine.color);
  const Icon = getRoutineIcon(routine.icon);

  return (
    <Pressable onPress={onToggle} disabled={disabled} style={({ pressed }) => [styles.doneRow, checked && styles.doneRowChecked, disabled && styles.disabledRow, pressed && styles.pressed]}>
      <View style={[styles.doneIcon, { backgroundColor: `${accent}20` }]}>
        <Icon color={accent} size={18} strokeWidth={2.4} />
      </View>
      <View style={styles.doneCopy}>
        <Text style={styles.doneName} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.doneMeta} numberOfLines={1}>
          {routine.category || 'Rotina diaria'}
        </Text>
      </View>
      {checked ? <CheckCircle2 color={colors.success} size={20} strokeWidth={2.4} /> : <CircleMinus color={colors.textSubtle} size={20} strokeWidth={2.4} />}
    </Pressable>
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
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(24, 24, 27, 0.58)',
  },
  daySelected: {
    borderColor: colors.textMuted,
    borderWidth: 2,
  },
  circleShell: {
    alignItems: 'center',
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  progressRing: {
    position: 'absolute',
  },
  dayText: {
    fontSize: typography.small,
    fontWeight: '800',
    lineHeight: 16,
  },
  todayDayText: {
    textDecorationLine: 'underline',
  },
  legend: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  legendDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  legendText: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: '700',
  },
  detailCard: {
    gap: spacing.md,
  },
  detailSummary: {
    alignItems: 'center',
    backgroundColor: 'rgba(161, 161, 170, 0.08)',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  detailPercent: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
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
    backgroundColor: 'rgba(161, 161, 170, 0.08)',
  },
  doneRowChecked: {
    borderColor: 'rgba(49, 208, 138, 0.28)',
    borderWidth: 1,
  },
  disabledRow: {
    opacity: 0.56,
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
