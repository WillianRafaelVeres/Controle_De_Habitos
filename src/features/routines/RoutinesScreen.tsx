import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Archive, Edit3, Plus } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { archiveActivity, createActivity, getActivitiesWithSchedules, setActivityActive, updateActivity } from '../../database';
import { colors, radii, spacing, typography } from '../../theme';
import type { ActivityFormValues, ActivityType, ActivityWithSchedules } from '../../types';
import { getRoutineColor, getRoutineIcon } from '../../utils/routineVisuals';
import { RoutineFormModal } from './RoutineFormModal';

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

const TYPE_LABELS: Record<ActivityType, string> = {
  study: 'Estudo',
  habit: 'Habito',
  task: 'Tarefa',
  prayer: 'Oracao',
  exercise: 'Exercicio',
  work: 'Trabalho',
  other: 'Outro',
};

export function RoutinesScreen() {
  const [routines, setRoutines] = useState<ActivityWithSchedules[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<ActivityWithSchedules | null>(null);
  const [saving, setSaving] = useState(false);

  const loadRoutines = useCallback(async () => {
    setRoutines(await getActivitiesWithSchedules(false));
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
          <Text style={styles.subtitle}>Atividades planejadas no QTS</Text>
        </View>
        <PrimaryButton label="Nova" icon={Plus} onPress={openCreate} style={styles.addButton} />
      </View>

      <SectionHeader title="Rotinas ativas" subtitle={`${routines.length} cadastradas`} />

      {routines.length === 0 ? (
        <EmptyState icon={Plus} title="Nenhuma rotina" subtitle="Cadastre atividades com dias da semana e horario opcional." />
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
        saving={saving}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSave}
      />
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
  const accent = getRoutineColor(routine.color);
  const Icon = getRoutineIcon(routine.icon);
  const isActive = routine.is_active === 1;

  return (
    <Card style={[styles.routineCard, !isActive && styles.routineInactive]}>
      <View style={styles.routineTop}>
        <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
          <Icon color={accent} size={22} strokeWidth={2.4} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.routineName} numberOfLines={1}>
            {routine.name}
          </Text>
          <Text style={styles.routineMeta} numberOfLines={1}>
            {TYPE_LABELS[routine.type]}{routine.category ? ` - ${routine.category}` : ''}
          </Text>
        </View>

        <Switch
          value={isActive}
          onValueChange={onToggleActive}
          thumbColor={isActive ? colors.secondary : colors.textSubtle}
          trackColor={{ false: 'rgba(148, 163, 184, 0.18)', true: 'rgba(20, 184, 166, 0.28)' }}
        />
      </View>

      <View style={styles.scheduleBlock}>
        <Text style={styles.scheduleLabel}>QTS</Text>
        <Text style={styles.scheduleText}>{formatScheduleSummary(routine)}</Text>
      </View>

      {routine.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {routine.description}
        </Text>
      ) : null}

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

  const days = routine.schedules
    .map((schedule) => schedule.weekday)
    .filter((weekday, index, list) => list.indexOf(weekday) === index)
    .sort((a, b) => a - b)
    .map((weekday) => WEEKDAY_SHORT[weekday])
    .join(', ');
  const fixed = routine.schedules.find((schedule) => schedule.has_fixed_time === 1);

  if (!fixed) {
    const reminder = routine.schedules.find((schedule) => schedule.reminder_time)?.reminder_time;

    return reminder ? `${days} - sem horario, lembrete ${reminder}` : `${days} - sem horario fixo`;
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
    justifyContent: 'space-between',
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
  addButton: {
    minWidth: 98,
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
    borderRadius: radii.lg,
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
  routineMeta: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  scheduleBlock: {
    gap: spacing.xs,
  },
  scheduleLabel: {
    color: colors.textSubtle,
    fontSize: typography.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  scheduleText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '700',
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: 18,
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
