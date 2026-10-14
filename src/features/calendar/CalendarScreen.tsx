import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CircleMinus } from 'lucide-react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { getPlannedItemsForDate, setPlannedItemCompleted } from '../../database';
import { colors, radii, spacing, typography } from '../../theme';
import type { PlannedActivityItem } from '../../types';
import {
  dateToKey,
  formatMonthTitle,
  formatReadableDate,
  getCalendarGrid,
  getMonthStart,
  getWeekdayLabels,
  nextMonth,
  previousMonth,
  todayKey,
} from '../../utils/date';
import { getActivityColor, getActivityIcon } from '../../utils/routineVisuals';

type DayProgress = {
  total: number;
  completed: number;
  percentage: number;
};

export function CalendarScreen() {
  const [itemsByDate, setItemsByDate] = useState<Map<string, PlannedActivityItem[]>>(new Map());
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [monthDate, setMonthDate] = useState(() => getMonthStart(new Date()));

  const cells = useMemo(() => getCalendarGrid(monthDate), [monthDate]);
  const dateKeys = useMemo(() => cells.flatMap((cell) => (cell ? [cell.key] : [])), [cells]);

  const loadCalendar = useCallback(async () => {
    const dayItems = await Promise.all(dateKeys.map((key) => getPlannedItemsForDate(key)));
    const nextItems = new Map<string, PlannedActivityItem[]>();

    dateKeys.forEach((key, index) => nextItems.set(key, dayItems[index]));
    setItemsByDate(nextItems);
  }, [dateKeys]);

  useFocusEffect(
    useCallback(() => {
      loadCalendar();
    }, [loadCalendar]),
  );

  const selectedItems = itemsByDate.get(selectedDate) ?? [];
  const selectedProgress = summarizeItems(selectedItems);
  const selectedCompleted = selectedItems.filter((item) => item.status === 'done');
  const selectedPending = selectedItems.filter((item) => item.status !== 'done');
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

  async function handleToggle(item: PlannedActivityItem) {
    if (selectedIsFuture) {
      return;
    }

    await setPlannedItemCompleted(item, item.status !== 'done');
    await loadCalendar();
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendario</Text>
        <Text style={styles.subtitle}>Acompanhe suas rotinas no mes</Text>
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

            const progress = summarizeItems(itemsByDate.get(cell.key) ?? []);
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
      </Card>

      <Card style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <View>
            <Text style={styles.detailDate}>{formatReadableDate(selectedDate)}</Text>
            <Text style={styles.detailSubtitle}>{selectedProgress.completed} de {selectedProgress.total} concluídas</Text>
          </View>
          <Text style={styles.detailPercent}>{selectedProgress.percentage}%</Text>
        </View>

        {selectedItems.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Nenhuma rotina neste dia" subtitle="Dias com rotinas aparecem aqui para acompanhar e marcar." />
        ) : (
          <>
            <RoutineSection title="Concluidas" items={selectedCompleted} disabled={selectedIsFuture} onToggle={handleToggle} />
            <RoutineSection title="Pendentes" items={selectedPending} disabled={selectedIsFuture} onToggle={handleToggle} />
          </>
        )}
      </Card>
    </Screen>
  );
}

function summarizeItems(items: PlannedActivityItem[]): DayProgress {
  const total = items.length;
  const completed = items.filter((item) => item.status === 'done').length;

  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
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
  const trackColor = isPast && hasPlanned && percentage === 0 ? 'rgba(239, 68, 68, 0.38)' : 'rgba(161, 161, 170, 0.14)';
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

function RoutineSection({
  title,
  items,
  disabled,
  onToggle,
}: {
  title: string;
  items: PlannedActivityItem[];
  disabled: boolean;
  onToggle: (item: PlannedActivityItem) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.routineSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.doneList}>
        {items.map((item) => (
          <CalendarRoutineRow key={item.schedule.id} item={item} disabled={disabled} onToggle={() => onToggle(item)} />
        ))}
      </View>
    </View>
  );
}

function CalendarRoutineRow({ item, disabled, onToggle }: { item: PlannedActivityItem; disabled: boolean; onToggle: () => void }) {
  const accent = getActivityColor(item.activity);
  const Icon = getActivityIcon(item.activity);
  const checked = item.status === 'done';

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={({ pressed }) => [
        styles.doneRow,
        checked && { borderColor: `${accent}66`, backgroundColor: `${accent}14` },
        disabled && styles.disabledRow,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.doneIcon, { backgroundColor: `${accent}22` }]}>
        <Icon color={accent} size={18} strokeWidth={2.4} />
      </View>
      <View style={styles.doneCopy}>
        <Text style={styles.doneName} numberOfLines={1}>
          {item.activity.name}
        </Text>
        <Text style={styles.doneMeta} numberOfLines={1}>
          {formatScheduleLabel(item)}
        </Text>
      </View>
      {checked ? <CheckCircle2 color={accent} size={20} strokeWidth={2.4} /> : <CircleMinus color={colors.textSubtle} size={20} strokeWidth={2.4} />}
    </Pressable>
  );
}

function formatScheduleLabel(item: PlannedActivityItem) {
  if (item.schedule.has_fixed_time === 1 || (item.schedule.start_time && item.schedule.end_time)) {
    return `${item.schedule.start_time ?? '--:--'} - ${item.schedule.end_time ?? '--:--'}`;
  }

  return item.activity.category_name ?? item.activity.category ?? 'Sem horario';
}

function getCalendarProgressColor(percentage: number, isFuture: boolean, isPast: boolean, hasPlanned: boolean) {
  if (isFuture || !hasPlanned) {
    return colors.textSubtle;
  }

  if (percentage === 0) {
    return isPast ? colors.danger : colors.textMuted;
  }

  if (percentage >= 85) {
    return colors.success;
  }

  if (percentage >= 50) {
    return colors.warning;
  }

  return colors.danger;
}

function IconButton({ onPress, icon: Icon }: { onPress: () => void; icon: typeof ChevronLeft }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Icon color={colors.text} size={19} strokeWidth={2.5} />
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
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderColor: 'rgba(20, 184, 166, 0.3)',
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
    borderColor: colors.secondary,
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
  detailCard: {
    gap: spacing.md,
  },
  detailHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  detailDate: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  detailSubtitle: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  detailPercent: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
  },
  routineSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
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
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    backgroundColor: 'rgba(161, 161, 170, 0.08)',
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
