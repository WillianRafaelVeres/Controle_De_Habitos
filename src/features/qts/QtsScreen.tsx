import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { CalendarRange, Expand, Plus, X } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { getActivitiesWithSchedules, getCategories, updateActivity } from '../../database';
import { colors, radii, spacing, typography } from '../../theme';
import type { ActivityFormValues, ActivityWithSchedules, Category, RootTabParamList, WeeklySchedule } from '../../types';
import { getActivityColor } from '../../utils/routineVisuals';
import { RoutineFormModal } from '../routines/RoutineFormModal';

const WEEKDAYS = [
  { value: 1, short: 'Seg', label: 'Segunda' },
  { value: 2, short: 'Ter', label: 'Terca' },
  { value: 3, short: 'Qua', label: 'Quarta' },
  { value: 4, short: 'Qui', label: 'Quinta' },
  { value: 5, short: 'Sex', label: 'Sexta' },
  { value: 6, short: 'Sab', label: 'Sabado' },
  { value: 0, short: 'Dom', label: 'Domingo' },
];

type QtsItem = {
  activity: ActivityWithSchedules;
  schedule: WeeklySchedule;
};

type QtsRow = {
  key: string;
  label: string;
  sortValue: string;
  cells: Map<number, QtsItem[]>;
};

export function QtsScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [activities, setActivities] = useState<ActivityWithSchedules[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingActivity, setEditingActivity] = useState<ActivityWithSchedules | null>(null);
  const [saving, setSaving] = useState(false);
  const [fullTableVisible, setFullTableVisible] = useState(false);
  const today = new Date().getDay();
  const todayInfo = WEEKDAYS.find((day) => day.value === today) ?? WEEKDAYS[0];

  const loadQts = useCallback(async () => {
    const [activityRows, categoryRows] = await Promise.all([getActivitiesWithSchedules(false), getCategories(false)]);

    setActivities(activityRows);
    setCategories(categoryRows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadQts();
    }, [loadQts]),
  );

  const tableRows = useMemo(() => buildQtsRows(activities), [activities]);
  const todayItems = useMemo(() => buildDayItems(activities, today), [activities, today]);
  const hasAnyActivity = tableRows.some((row) => WEEKDAYS.some((day) => (row.cells.get(day.value)?.length ?? 0) > 0));

  async function handleSave(values: ActivityFormValues) {
    if (!editingActivity) {
      return;
    }

    setSaving(true);

    try {
      await updateActivity(editingActivity.id, values);
      setEditingActivity(null);
      await loadQts();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>QTS</Text>
          <Text style={styles.subtitle}>Hoje - {todayInfo.label}</Text>
        </View>
        <PrimaryButton label="Nova" icon={Plus} onPress={() => navigation.navigate('Routines')} style={styles.addButton} />
      </View>

      {!hasAnyActivity ? (
        <EmptyState icon={CalendarRange} title="QTS vazio" subtitle="Crie uma rotina com dias da semana para montar sua agenda." />
      ) : (
        <>
          <View style={styles.actionRow}>
            <PrimaryButton label="Semana" icon={Expand} onPress={() => setFullTableVisible(true)} variant="secondary" />
          </View>

          <Card style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <Text style={styles.todayTitle}>Rotinas de hoje</Text>
              <Text style={styles.todayCount}>{todayItems.length}</Text>
            </View>
            {todayItems.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma rotina planejada para hoje.</Text>
            ) : (
              <View style={styles.todayList}>
                {todayItems.map((item) => (
                  <DayAgendaItem key={item.schedule.id} item={item} onPress={() => setEditingActivity(item.activity)} />
                ))}
              </View>
            )}
          </Card>
        </>
      )}

      <FullQtsModal visible={fullTableVisible} rows={tableRows} onClose={() => setFullTableVisible(false)} onEdit={setEditingActivity} />

      <RoutineFormModal
        visible={Boolean(editingActivity)}
        routine={editingActivity}
        categories={categories}
        saving={saving}
        onClose={() => setEditingActivity(null)}
        onSubmit={handleSave}
      />
    </Screen>
  );
}

function FullQtsModal({
  visible,
  rows,
  onClose,
  onEdit,
}: {
  visible: boolean;
  rows: QtsRow[];
  onClose: () => void;
  onEdit: (activity: ActivityWithSchedules) => void;
}) {
  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => undefined);

    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
    };
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.fullScreen}>
        <Pressable accessibilityLabel="Fechar tabela semanal" onPress={onClose} style={styles.closeButton}>
          <X color={colors.textMuted} size={16} />
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fullTableScroll}>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <View style={[styles.headerCell, styles.timeHeaderCell]}>
                <Text style={styles.headerText}>Horario</Text>
              </View>
              {WEEKDAYS.map((day) => (
                <View key={day.value} style={styles.headerCell}>
                  <Text style={styles.headerText}>{day.short}</Text>
                </View>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {rows.map((row) => (
                <View key={row.key} style={styles.tableRow}>
                  <View style={styles.timeCell}>
                    <Text style={styles.timeText}>{row.label}</Text>
                  </View>
                  {WEEKDAYS.map((day) => (
                    <View key={`${row.key}-${day.value}`} style={styles.dayCell}>
                      <CellItems items={row.cells.get(day.value) ?? []} onPress={onEdit} />
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function DayAgendaItem({ item, onPress }: { item: QtsItem; onPress: () => void }) {
  const accent = getActivityColor(item.activity);
  const fixed = isFixedSchedule(item.schedule);
  const time = fixed ? `${item.schedule.start_time ?? '--:--'} - ${item.schedule.end_time ?? '--:--'}` : 'Sem horario';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.agendaItem, pressed && styles.agendaPressed]}>
      <View style={[styles.agendaMarker, { backgroundColor: accent }]} />
      <View style={styles.agendaCopy}>
        <Text style={styles.agendaTime}>{time}</Text>
        <Text style={styles.agendaName} numberOfLines={2}>
          {item.activity.name}
        </Text>
        {item.activity.category_name || item.activity.category ? (
          <Text style={styles.agendaCategory} numberOfLines={1}>
            {item.activity.category_name ?? item.activity.category}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function CellItems({ items, onPress }: { items: QtsItem[]; onPress: (activity: ActivityWithSchedules) => void }) {
  if (items.length === 0) {
    return <Text style={styles.emptyCell}>-</Text>;
  }

  return (
    <View style={styles.cellStack}>
      {items.map((item) => (
        <Pressable
          key={item.schedule.id}
          onPress={() => onPress(item.activity)}
          style={({ pressed }) => [
            styles.cellItem,
            {
              borderColor: `${getActivityColor(item.activity)}77`,
              backgroundColor: `${getActivityColor(item.activity)}20`,
            },
            pressed && styles.cellItemPressed,
          ]}
        >
          <Text style={[styles.cellItemText, { color: getActivityColor(item.activity) }]} numberOfLines={2}>
            {item.activity.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function buildDayItems(activities: ActivityWithSchedules[], weekday: number) {
  const items: QtsItem[] = [];

  for (const activity of activities) {
    for (const schedule of activity.schedules) {
      if (schedule.weekday === weekday) {
        items.push({ activity, schedule });
      }
    }
  }

  return items.sort((a, b) => {
    const aTime = isFixedSchedule(a.schedule) ? a.schedule.start_time ?? '99:99' : '99:99';
    const bTime = isFixedSchedule(b.schedule) ? b.schedule.start_time ?? '99:99' : '99:99';

    return aTime.localeCompare(bTime) || a.activity.name.localeCompare(b.activity.name);
  });
}

function buildQtsRows(activities: ActivityWithSchedules[]) {
  const rows = new Map<string, QtsRow>();
  const flexibleRow = createRow('flexible', 'Sem horario', '99:99');

  for (const activity of activities) {
    for (const schedule of activity.schedules) {
      const targetRow = isFixedSchedule(schedule) ? getOrCreateRow(rows, schedule) : flexibleRow;
      const cell = targetRow.cells.get(schedule.weekday) ?? [];

      cell.push({ activity, schedule });
      targetRow.cells.set(schedule.weekday, cell);
    }
  }

  for (const row of rows.values()) {
    sortCells(row);
  }

  sortCells(flexibleRow);

  const fixedRows = [...rows.values()].sort((a, b) => a.sortValue.localeCompare(b.sortValue));
  const hasFlexibleItems = WEEKDAYS.some((day) => (flexibleRow.cells.get(day.value)?.length ?? 0) > 0);

  return hasFlexibleItems ? [...fixedRows, flexibleRow] : fixedRows;
}

function isFixedSchedule(schedule: WeeklySchedule) {
  return schedule.has_fixed_time === 1 || Boolean(schedule.start_time && schedule.end_time);
}

function getOrCreateRow(rows: Map<string, QtsRow>, schedule: WeeklySchedule) {
  const start = schedule.start_time ?? '--:--';
  const end = schedule.end_time ?? '--:--';
  const key = `${start}-${end}`;
  const existing = rows.get(key);

  if (existing) {
    return existing;
  }

  const row = createRow(key, `${start}\n${end}`, start);
  rows.set(key, row);

  return row;
}

function createRow(key: string, label: string, sortValue: string): QtsRow {
  const cells = new Map<number, QtsItem[]>();

  for (const day of WEEKDAYS) {
    cells.set(day.value, []);
  }

  return { key, label, sortValue, cells };
}

function sortCells(row: QtsRow) {
  for (const items of row.cells.values()) {
    items.sort((a, b) => a.activity.name.localeCompare(b.activity.name));
  }
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
    paddingBottom: 116,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    marginTop: spacing.xs,
  },
  addButton: {
    minWidth: 98,
  },
  actionRow: {
    alignItems: 'stretch',
  },
  todayCard: {
    gap: spacing.md,
  },
  todayHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  todayTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  todayCount: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '900',
    minWidth: 32,
    overflow: 'hidden',
    textAlign: 'center',
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(20, 184, 166, 0.18)',
  },
  todayList: {
    gap: spacing.sm,
  },
  agendaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(161, 161, 170, 0.07)',
    padding: spacing.md,
  },
  agendaPressed: {
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
  },
  agendaMarker: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 999,
  },
  agendaCopy: {
    flex: 1,
    minWidth: 0,
  },
  agendaTime: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  agendaName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  agendaCategory: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  closeButton: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    zIndex: 2,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(27, 30, 36, 0.86)',
  },
  fullTableScroll: {
    paddingTop: 36,
    paddingBottom: spacing.md,
  },
  table: {
    minWidth: 912,
    overflow: 'hidden',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceStrong,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  headerCell: {
    width: 118,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  timeHeaderCell: {
    width: 86,
    borderLeftWidth: 0,
  },
  headerText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '900',
  },
  timeCell: {
    width: 86,
    minHeight: 82,
    justifyContent: 'center',
    padding: spacing.sm,
    backgroundColor: 'rgba(161, 161, 170, 0.04)',
  },
  timeText: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: '900',
    lineHeight: 16,
    textAlign: 'center',
  },
  dayCell: {
    width: 118,
    minHeight: 82,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    padding: spacing.xs,
  },
  emptyCell: {
    color: colors.textSubtle,
    fontSize: typography.tiny,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  cellStack: {
    gap: spacing.xs,
  },
  cellItem: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cellItemPressed: {
    opacity: 0.8,
  },
  cellItemText: {
    color: colors.text,
    fontSize: typography.tiny,
    fontWeight: '800',
    lineHeight: 14,
  },
});
