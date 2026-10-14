import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronLeft, ChevronRight, Circle, PlusCircle } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { getPlannedItemsForDate, setPlannedItemCompleted } from '../../database';
import { colors, radii, spacing, typography } from '../../theme';
import type { PlannedActivityItem } from '../../types';
import { addDays, dateToKey, formatReadableDate, parseDateKey, todayKey } from '../../utils/date';
import { getActivityColor, getActivityIcon } from '../../utils/routineVisuals';

export function DashboardScreen() {
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [items, setItems] = useState<PlannedActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDay = useCallback(async () => {
    setLoading(true);
    setItems(await getPlannedItemsForDate(selectedDate));
    setLoading(false);
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadDay();
    }, [loadDay]),
  );

  const doneCount = items.filter((item) => item.status === 'done').length;
  const plannedCount = items.length;
  const progress = plannedCount > 0 ? Math.round((doneCount / plannedCount) * 100) : 0;
  const fixedItems = useMemo(
    () => items.filter((item) => isFixedSchedule(item)).sort((a, b) => (a.schedule.start_time ?? '').localeCompare(b.schedule.start_time ?? '')),
    [items],
  );
  const looseItems = useMemo(() => items.filter((item) => !isFixedSchedule(item)), [items]);
  const isFuture = selectedDate > todayKey();

  function changeDate(amount: number) {
    setSelectedDate(dateToKey(addDays(parseDateKey(selectedDate), amount)));
  }

  async function handleToggle(item: PlannedActivityItem) {
    if (isFuture) {
      return;
    }

    await setPlannedItemCompleted(item, item.status !== 'done');
    await loadDay();
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Hoje</Text>
        <Text style={styles.subtitle}>{formatReadableDate(selectedDate)}</Text>
      </View>

      <View style={styles.dateControls}>
        <IconButton icon={ChevronLeft} onPress={() => changeDate(-1)} />
        <Pressable onPress={() => setSelectedDate(todayKey())} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>Hoje</Text>
        </Pressable>
        <IconButton icon={ChevronRight} onPress={() => changeDate(1)} />
      </View>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <Text style={styles.summaryLabel}>Resumo do dia</Text>
          <Text style={styles.summaryValue}>{progress}%</Text>
        </View>
        <ProgressBar value={progress} height={8} />
        <Text style={styles.summaryDetail}>
          {doneCount} de {plannedCount} atividades feitas
        </Text>
      </Card>

      {plannedCount === 0 ? (
        <EmptyState icon={PlusCircle} title="Nada previsto" subtitle="Cadastre rotinas na aba Rotinas para montar seu QTS semanal." />
      ) : (
        <>
          <ActivitySection title="Com horario" items={fixedItems} loading={loading} onToggle={handleToggle} disabled={isFuture} />
          <ActivitySection title="Sem horario fixo" items={looseItems} loading={loading} onToggle={handleToggle} disabled={isFuture} />
        </>
      )}
    </Screen>
  );
}

function ActivitySection({
  title,
  items,
  loading,
  disabled,
  onToggle,
}: {
  title: string;
  items: PlannedActivityItem[];
  loading: boolean;
  disabled: boolean;
  onToggle: (item: PlannedActivityItem) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <SectionHeader title={title} subtitle={loading ? 'Carregando...' : `${items.length} previstas`} />
      <View style={styles.list}>
        {items.map((item) => (
          <ActivityRow key={`${item.schedule.id}-${item.date}`} item={item} disabled={disabled} onToggle={() => onToggle(item)} />
        ))}
      </View>
    </View>
  );
}

function ActivityRow({ item, disabled, onToggle }: { item: PlannedActivityItem; disabled: boolean; onToggle: () => void }) {
  const accent = getActivityColor(item.activity);
  const Icon = getActivityIcon(item.activity);
  const done = item.status === 'done';
  const notDone = item.status === 'not_done';
  const timeLabel = isFixedSchedule(item) ? `${item.schedule.start_time ?? '--:--'}-${item.schedule.end_time ?? '--:--'}` : 'Sem horario';

  return (
    <Pressable onPress={onToggle} disabled={disabled} style={({ pressed }) => [styles.row, done && styles.rowDone, notDone && styles.rowNotDone, disabled && styles.rowDisabled, pressed && styles.pressed]}>
      <View style={[styles.marker, { backgroundColor: `${accent}24` }]}>
        <Icon color={accent} size={16} strokeWidth={2.4} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.timeText}>{timeLabel}</Text>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.activity.name}
        </Text>
        <View style={styles.rowMetaLine}>
          <Text style={styles.rowMeta}>{getStatusLabel(item.status)}</Text>
          {item.activity.category_name || item.activity.category ? (
            <View style={[styles.categoryChip, { borderColor: `${accent}66`, backgroundColor: `${accent}14` }]}>
              <Text style={styles.categoryChipText} numberOfLines={1}>
                {item.activity.category_name ?? item.activity.category}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={[styles.check, done && { backgroundColor: accent, borderColor: accent }]}>
        {done ? <Check color={colors.white} size={17} strokeWidth={3} /> : <Circle color={notDone ? colors.danger : colors.textSubtle} size={19} />}
      </View>
    </Pressable>
  );
}

function isFixedSchedule(item: PlannedActivityItem) {
  return item.schedule.has_fixed_time === 1 || Boolean(item.schedule.start_time && item.schedule.end_time);
}

function getStatusLabel(status: PlannedActivityItem['status']) {
  if (status === 'done') {
    return 'Feito';
  }

  if (status === 'not_done') {
    return 'Nao feito';
  }

  if (status === 'planned') {
    return 'Previsto';
  }

  return 'Pendente';
}

function IconButton({ onPress, icon: Icon }: { onPress: () => void; icon: typeof ChevronLeft }) {
  return (
    <Pressable onPress={onPress} style={styles.iconButton}>
      <Icon color={colors.text} size={18} strokeWidth={2.5} />
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
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
  },
  dateControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
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
  todayButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    height: 38,
    justifyContent: 'center',
  },
  todayButtonText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '800',
  },
  summaryCard: {
    gap: spacing.md,
  },
  summaryTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '800',
  },
  summaryDetail: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  section: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 72,
    padding: spacing.md,
  },
  rowDone: {
    borderColor: 'rgba(34, 197, 94, 0.36)',
  },
  rowNotDone: {
    borderColor: 'rgba(239, 68, 68, 0.34)',
  },
  rowDisabled: {
    opacity: 0.62,
  },
  pressed: {
    opacity: 0.78,
  },
  marker: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  timeText: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: '800',
  },
  rowName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  rowMeta: {
    color: colors.textSubtle,
    fontSize: typography.tiny,
  },
  rowMetaLine: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 140,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  categoryChipText: {
    color: colors.text,
    fontSize: typography.tiny,
    fontWeight: '800',
  },
  check: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 15,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
});
