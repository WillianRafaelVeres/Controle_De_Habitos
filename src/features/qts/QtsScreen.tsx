import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CalendarRange, Clock3, Plus } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { createCategory, getActivitiesWithSchedules, getCategories, updateActivity } from '../../database';
import { colors, radii, spacing, typography } from '../../theme';
import type { ActivityFormValues, ActivityWithSchedules, Category, CategoryFormValues, RootTabParamList, WeeklySchedule } from '../../types';
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

export function QtsScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [activities, setActivities] = useState<ActivityWithSchedules[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<ActivityWithSchedules | null>(null);
  const [saving, setSaving] = useState(false);

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

  const filteredActivities = useMemo(
    () => (selectedCategoryId ? activities.filter((activity) => activity.category_id === selectedCategoryId) : activities),
    [activities, selectedCategoryId],
  );

  const scheduledByDay = useMemo(() => {
    const map = new Map<number, QtsItem[]>();

    for (const day of WEEKDAYS) {
      map.set(day.value, []);
    }

    for (const activity of filteredActivities) {
      for (const schedule of activity.schedules) {
        if (schedule.has_fixed_time === 1) {
          map.get(schedule.weekday)?.push({ activity, schedule });
        }
      }
    }

    for (const items of map.values()) {
      items.sort((a, b) => (a.schedule.start_time ?? '99:99').localeCompare(b.schedule.start_time ?? '99:99'));
    }

    return map;
  }, [filteredActivities]);

  const flexibleByDay = useMemo(() => {
    const map = new Map<number, QtsItem[]>();

    for (const day of WEEKDAYS) {
      map.set(day.value, []);
    }

    for (const activity of filteredActivities) {
      for (const schedule of activity.schedules) {
        if (schedule.has_fixed_time !== 1) {
          map.get(schedule.weekday)?.push({ activity, schedule });
        }
      }
    }

    for (const items of map.values()) {
      items.sort((a, b) => a.activity.name.localeCompare(b.activity.name));
    }

    return map;
  }, [filteredActivities]);

  const hasAnyActivity = filteredActivities.some((activity) => activity.schedules.length > 0);

  function openEdit(activity: ActivityWithSchedules) {
    setEditingActivity(activity);
  }

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

  async function handleCreateCategory(values: CategoryFormValues) {
    const category = await createCategory(values);
    await loadQts();

    return category;
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>QTS</Text>
          <Text style={styles.subtitle}>Quadro semanal de rotinas</Text>
        </View>
        <PrimaryButton label="Nova" icon={Plus} onPress={() => navigation.navigate('Routines')} style={styles.addButton} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        <FilterPill label="Todas" selected={!selectedCategoryId} onPress={() => setSelectedCategoryId(null)} />
        {categories.map((category) => (
          <FilterPill
            key={category.id}
            label={category.name}
            color={category.color}
            selected={selectedCategoryId === category.id}
            onPress={() => setSelectedCategoryId(category.id)}
          />
        ))}
      </ScrollView>

      {!hasAnyActivity ? (
        <EmptyState icon={CalendarRange} title="QTS vazio" subtitle="Crie rotinas com dias da semana para montar seu quadro." />
      ) : (
        <>
          <SectionHeader title="Com horario fixo" subtitle="Atividades ordenadas por horario" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekScroll}>
            {WEEKDAYS.map((day) => (
              <DayColumn key={day.value} day={day.label} items={scheduledByDay.get(day.value) ?? []} onEdit={openEdit} />
            ))}
          </ScrollView>

          <SectionHeader title="Sem horario fixo" subtitle="Previstas por dia, com lembrete opcional" />
          <View style={styles.flexList}>
            {WEEKDAYS.map((day) => {
              const items = flexibleByDay.get(day.value) ?? [];

              if (items.length === 0) {
                return null;
              }

              return (
                <Card key={day.value} style={styles.flexCard}>
                  <Text style={styles.flexDay}>{day.label}</Text>
                  <View style={styles.flexItems}>
                    {items.map((item) => (
                      <QtsPill key={item.schedule.id} item={item} onPress={() => openEdit(item.activity)} />
                    ))}
                  </View>
                </Card>
              );
            })}
          </View>
        </>
      )}

      <RoutineFormModal
        visible={Boolean(editingActivity)}
        routine={editingActivity}
        categories={categories}
        saving={saving}
        onClose={() => setEditingActivity(null)}
        onCreateCategory={handleCreateCategory}
        onSubmit={handleSave}
      />
    </Screen>
  );
}

function DayColumn({ day, items, onEdit }: { day: string; items: QtsItem[]; onEdit: (activity: ActivityWithSchedules) => void }) {
  return (
    <Card style={styles.dayColumn}>
      <Text style={styles.dayTitle}>{day}</Text>
      {items.length === 0 ? (
        <Text style={styles.emptyDay}>Sem horario</Text>
      ) : (
        <View style={styles.dayItems}>
          {items.map((item) => (
            <QtsBlock key={item.schedule.id} item={item} onPress={() => onEdit(item.activity)} />
          ))}
        </View>
      )}
    </Card>
  );
}

function QtsBlock({ item, onPress }: { item: QtsItem; onPress: () => void }) {
  const accent = getActivityColor(item.activity);

  return (
    <Pressable onPress={onPress} style={[styles.qtsBlock, { borderLeftColor: accent }]}>
      <View style={styles.timeRow}>
        <Clock3 color={colors.textMuted} size={13} />
        <Text style={styles.timeText}>
          {item.schedule.start_time ?? '--:--'}-{item.schedule.end_time ?? '--:--'}
        </Text>
      </View>
      <Text style={styles.blockName} numberOfLines={2}>
        {item.activity.name}
      </Text>
      {item.activity.category_name || item.activity.category ? (
        <Text style={styles.blockCategory} numberOfLines={1}>
          {item.activity.category_name ?? item.activity.category}
        </Text>
      ) : null}
    </Pressable>
  );
}

function QtsPill({ item, onPress }: { item: QtsItem; onPress: () => void }) {
  const accent = getActivityColor(item.activity);

  return (
    <Pressable onPress={onPress} style={[styles.flexPill, { borderColor: `${accent}77`, backgroundColor: `${accent}14` }]}>
      <Text style={styles.flexName} numberOfLines={1}>
        {item.activity.name}
      </Text>
      {item.schedule.reminder_time ? <Text style={styles.flexReminder}>{item.schedule.reminder_time}</Text> : null}
    </Pressable>
  );
}

function FilterPill({
  label,
  color,
  selected,
  onPress,
}: {
  label: string;
  color?: string | null;
  selected: boolean;
  onPress: () => void;
}) {
  const accent = color ?? colors.secondary;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterPill, selected && { borderColor: accent, backgroundColor: `${accent}18` }]}
    >
      <Text style={[styles.filterText, selected && styles.filterTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
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
  filterScroll: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  filterPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(161, 161, 170, 0.06)',
    maxWidth: 150,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '800',
  },
  filterTextActive: {
    color: colors.text,
  },
  weekScroll: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  dayColumn: {
    width: 172,
    gap: spacing.md,
  },
  dayTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
  },
  emptyDay: {
    color: colors.textSubtle,
    fontSize: typography.small,
    fontWeight: '700',
  },
  dayItems: {
    gap: spacing.sm,
  },
  qtsBlock: {
    borderLeftWidth: 3,
    borderRadius: radii.md,
    backgroundColor: 'rgba(161, 161, 170, 0.07)',
    gap: spacing.xs,
    padding: spacing.md,
  },
  timeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  timeText: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: '900',
  },
  blockName: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '900',
  },
  blockCategory: {
    color: colors.textSubtle,
    fontSize: typography.tiny,
    fontWeight: '700',
  },
  flexList: {
    gap: spacing.md,
  },
  flexCard: {
    gap: spacing.md,
  },
  flexDay: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
  },
  flexItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  flexPill: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  flexName: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '800',
    maxWidth: 190,
  },
  flexReminder: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: '900',
  },
});
