import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Edit3, Plus, Power, Trash2 } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { createRoutine, deleteRoutine, getRoutines, setRoutineActive, updateRoutine } from '../../database';
import { colors, radii, spacing, typography } from '../../theme';
import type { Routine, RoutineFormValues } from '../../types';
import { getDaysInMonth } from '../../utils/date';
import { getRoutineColor, getRoutineIcon } from '../../utils/routineVisuals';
import { RoutineFormModal } from './RoutineFormModal';

export function RoutinesScreen() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [saving, setSaving] = useState(false);

  const loadRoutines = useCallback(async () => {
    setRoutines(await getRoutines(true));
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

  function openEdit(routine: Routine) {
    setEditingRoutine(routine);
    setModalVisible(true);
  }

  async function handleSave(values: RoutineFormValues) {
    setSaving(true);

    try {
      if (editingRoutine) {
        await updateRoutine(editingRoutine.id, values);
      } else {
        await createRoutine(values);
      }

      setModalVisible(false);
      setEditingRoutine(null);
      await loadRoutines();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(routine: Routine) {
    await setRoutineActive(routine.id, routine.is_active !== 1);
    await loadRoutines();
  }

  function handleDelete(routine: Routine) {
    Alert.alert('Excluir rotina', `Excluir "${routine.name}" e todos os registros dela?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteRoutine(routine.id);
          await loadRoutines();
        },
      },
    ]);
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Rotinas</Text>
        <PrimaryButton label="Nova" icon={Plus} onPress={openCreate} style={styles.addButton} />
      </View>

      <SectionHeader title="Cadastro" subtitle={`${routines.length} rotinas no banco local`} />

      {routines.length === 0 ? (
        <EmptyState icon={Plus} title="Comece por uma rotina" subtitle="Cadastre uma rotina diaria para liberar progresso, calendario e estatisticas." />
      ) : (
        <View style={styles.list}>
          {routines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onEdit={() => openEdit(routine)}
              onDelete={() => handleDelete(routine)}
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
  onDelete,
  onToggleActive,
}: {
  routine: Routine;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const accent = getRoutineColor(routine.color);
  const Icon = getRoutineIcon(routine.icon);
  const isActive = routine.is_active === 1;
  const goalPercent = routine.monthly_goal_percent ?? 80;
  const goalDays = Math.ceil(getDaysInMonth() * (goalPercent / 100));

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
            {routine.category || 'Rotina diaria'}
            {` - Meta: ${goalPercent}% (${goalDays} dias neste mes)`}
          </Text>
          {routine.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {routine.description}
            </Text>
          ) : null}
        </View>

        <Switch
          value={isActive}
          onValueChange={onToggleActive}
          thumbColor={isActive ? colors.secondary : colors.textSubtle}
          trackColor={{ false: 'rgba(148, 163, 184, 0.18)', true: 'rgba(38, 217, 255, 0.28)' }}
        />
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onEdit} style={styles.actionButton}>
          <Edit3 color={colors.text} size={18} />
          <Text style={styles.actionText}>Editar</Text>
        </Pressable>
        <Pressable onPress={onToggleActive} style={styles.actionButton}>
          <Power color={isActive ? colors.success : colors.textSubtle} size={18} />
          <Text style={styles.actionText}>{isActive ? 'Ativa' : 'Inativa'}</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={[styles.actionButton, styles.deleteButton]}>
          <Trash2 color={colors.danger} size={18} />
          <Text style={[styles.actionText, styles.deleteText]}>Excluir</Text>
        </Pressable>
      </View>
    </Card>
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
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '900',
  },
  addButton: {
    minWidth: 112,
  },
  list: {
    gap: spacing.md,
  },
  routineCard: {
    gap: spacing.lg,
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
    width: 50,
    height: 50,
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
    fontSize: typography.h3,
    fontWeight: '900',
  },
  routineMeta: {
    color: colors.secondary,
    fontSize: typography.small,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  actionText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '800',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 93, 115, 0.12)',
  },
  deleteText: {
    color: colors.danger,
  },
});
