import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Archive, Edit3, Plus, Tags } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { archiveActivity, createActivity, getActivitiesWithSchedules, getCategories, setActivityActive, updateActivity } from '../../database';
import { colors, radii, spacing, typography } from '../../theme';
import type { ActivityFormValues, ActivityWithSchedules, Category } from '../../types';
import { getActivityIcon } from '../../utils/routineVisuals';
import { CategoryManagerModal } from '../categories/CategoryManagerModal';
import { RoutineFormModal } from './RoutineFormModal';

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function RoutinesScreen() {
  const [routines, setRoutines] = useState<ActivityWithSchedules[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<ActivityWithSchedules | null>(null);
  const [saving, setSaving] = useState(false);

  const loadRoutines = useCallback(async () => {
    const [activities, categoryRows] = await Promise.all([getActivitiesWithSchedules(false), getCategories(false)]);

    setRoutines(activities);
    setCategories(categoryRows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, [loadRoutines]),
  );

  function openCreate() {
    setEditingRoutine(null);
    setModalVisible(true);
  }

  function openEdit(routine: ActivityWithSchedules) {
    setEditingRoutine(routine);
    setModalVisible(true);
  }

  async function handleSave(values: ActivityFormValues) {
    setSaving(true);

    try {
      if (editingRoutine) {
        await updateActivity(editingRoutine.id, values);
      } else {
        await createActivity(values);
      }

      setModalVisible(false);
      setEditingRoutine(null);
      await loadRoutines();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(routine: ActivityWithSchedules) {
    await setActivityActive(routine.id, routine.is_active !== 1);
    await loadRoutines();
  }

  function handleArchive(routine: ActivityWithSchedules) {
    Alert.alert('Arquivar rotina', `Remover "${routine.name}" da rotina atual? Os registros anteriores serao mantidos no historico.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Arquivar',
        style: 'destructive',
        onPress: async () => {
          await archiveActivity(routine.id);
          await loadRoutines();
        },
      },
    ]);
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Rotinas</Text>
          <Text style={styles.subtitle}>{routines.length} cadastradas no QTS</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable accessibilityLabel="Categorias" onPress={() => setCategoryModalVisible(true)} style={styles.iconButton}>
            <Tags color={colors.textMuted} size={20} />
          </Pressable>
          <PrimaryButton label="Nova" icon={Plus} onPress={openCreate} style={styles.addButton} />
        </View>
      </View>

      {routines.length === 0 ? (
        <EmptyState icon={Plus} title="Nenhuma rotina" subtitle="Crie uma rotina escolhendo nome, dias e horario opcional." />
      ) : (
        <View style={styles.list}>
          {routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onEdit={() => openEdit(routine)}
              onArchive={() => handleArchive(routine)}
              onToggleActive={() => handleToggleActive(routine)}
            />
          ))}
        </View>
      )}

      <RoutineFormModal
        visible={modalVisible}
        routine={editingRoutine}
        categories={categories}
        saving={saving}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSave}
      />
      <CategoryManagerModal visible={categoryModalVisible} onClose={() => setCategoryModalVisible(false)} onChanged={loadRoutines} />
    </Screen>
  );
}

function RoutineCard({
  routine,
  onEdit,
  onArchive,
  onToggleActive,
}: {
  routine: ActivityWithSchedules;
  onEdit: () => void;
  onArchive: () => void;
  onToggleActive: () => void;
}) {
  const Icon = getActivityIcon(routine);
  const isActive = routine.is_active === 1;

  return (
    <Card style={[styles.routineCard, !isActive && styles.routineInactive]}>
      <View style={styles.routineTop}>
        <View style={styles.iconWrap}>
          <Icon color={isActive ? colors.text : colors.textSubtle} size={20} strokeWidth={2.3} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.routineName} numberOfLines={1}>
            {routine.name}
          </Text>
          <Text style={styles.scheduleText} numberOfLines={2}>
            {formatScheduleSummary(routine)}
          </Text>
        </View>

        <Switch
          value={isActive}
          onValueChange={onToggleActive}
          thumbColor={isActive ? colors.secondary : colors.textSubtle}
          trackColor={{ false: 'rgba(148, 163, 184, 0.18)', true: 'rgba(20, 184, 166, 0.28)' }}
        />
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onEdit} style={styles.actionButton}>
          <Edit3 color={colors.textMuted} size={17} />
          <Text style={styles.actionText}>Editar</Text>
        </Pressable>
        <Pressable onPress={onArchive} style={[styles.actionButton, styles.deleteButton]}>
          <Archive color={colors.danger} size={17} />
          <Text style={[styles.actionText, styles.deleteText]}>Arquivar</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function formatScheduleSummary(routine: ActivityWithSchedules) {
  if (routine.schedules.length === 0) {
    return 'Sem dias planejados';
  }

  const uniqueDays = routine.schedules
    .map((schedule) => schedule.weekday)
    .filter((weekday, index, list) => list.indexOf(weekday) === index)
    .sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b));
  const days = uniqueDays.length === 7 ? 'Todos os dias' : uniqueDays.map((weekday) => WEEKDAY_SHORT[weekday]).join(', ');
  const fixed = routine.schedules.find((schedule) => schedule.has_fixed_time === 1);

  if (!fixed) {
    return `${days} - sem horario`;
  }

  return `${days} - ${fixed.start_time ?? '--:--'} as ${fixed.end_time ?? '--:--'}`;
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
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(161, 161, 170, 0.06)',
  },
  addButton: {
    minWidth: 96,
  },
  list: {
    gap: spacing.md,
  },
  routineCard: {
    gap: spacing.md,
  },
  routineInactive: {
    opacity: 0.68,
  },
  routineTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: 'rgba(161, 161, 170, 0.08)',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  routineName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },
  scheduleText: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(161, 161, 170, 0.08)',
  },
  actionText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '800',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteText: {
    color: colors.danger,
  },
});
