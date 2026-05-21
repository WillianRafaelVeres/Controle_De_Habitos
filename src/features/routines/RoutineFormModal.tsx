import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Save, X } from 'lucide-react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { colors, radii, spacing, typography } from '../../theme';
import type { Routine, RoutineFormValues } from '../../types';
import { ROUTINE_COLORS, ROUTINE_ICONS } from '../../utils/routineVisuals';

type RoutineFormModalProps = {
  visible: boolean;
  routine: Routine | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: RoutineFormValues) => Promise<void>;
};

export function RoutineFormModal({ visible, routine, saving, onClose, onSubmit }: RoutineFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [icon, setIcon] = useState(ROUTINE_ICONS[0].key);
  const [color, setColor] = useState(ROUTINE_COLORS[0]);
  const [monthlyGoalPercent, setMonthlyGoalPercent] = useState('80');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(routine?.name ?? '');
    setDescription(routine?.description ?? '');
    setCategory(routine?.category ?? '');
    setIcon(routine?.icon ?? ROUTINE_ICONS[0].key);
    setColor(routine?.color ?? ROUTINE_COLORS[0]);
    setMonthlyGoalPercent(String(routine?.monthly_goal_percent ?? 80));
    setError(null);
  }, [routine, visible]);

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Informe um nome para a rotina.');
      return;
    }

    const parsedGoal = monthlyGoalPercent.trim() ? Number(monthlyGoalPercent.replace(/\D/g, '')) : 80;

    if (!parsedGoal || parsedGoal < 1 || parsedGoal > 100) {
      setError('A meta mensal deve estar entre 1 e 100%.');
      return;
    }

    await onSubmit({
      name,
      description,
      category,
      icon,
      color,
      monthly_goal_percent: parsedGoal,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{routine ? 'Editar rotina' : 'Nova rotina'}</Text>
              <Text style={styles.subtitle}>Frequencia diaria</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X color={colors.text} size={20} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
            <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Meditar" />
            <TextField
              label="Descricao opcional"
              value={description}
              onChangeText={setDescription}
              placeholder="Detalhe rapido da rotina"
              multiline
              style={styles.textArea}
            />
            <TextField label="Categoria" value={category} onChangeText={setCategory} placeholder="Saude, Foco, Casa..." />
            <TextField
              label="Meta mensal (%)"
              value={monthlyGoalPercent}
              onChangeText={setMonthlyGoalPercent}
              placeholder="Ex.: 80"
              keyboardType="number-pad"
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Icone</Text>
              <View style={styles.iconGrid}>
                {ROUTINE_ICONS.map((item) => {
                  const selected = item.key === icon;
                  const Icon = item.Icon;

                  return (
                    <Pressable
                      accessibilityLabel={item.label}
                      key={item.key}
                      onPress={() => setIcon(item.key)}
                      style={[styles.iconOption, selected && { borderColor: color, backgroundColor: `${color}20` }]}
                    >
                      <Icon size={20} color={selected ? color : colors.textMuted} strokeWidth={2.4} />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Cor</Text>
              <View style={styles.colorGrid}>
                {ROUTINE_COLORS.map((item) => (
                  <Pressable
                    accessibilityLabel={`Cor ${item}`}
                    key={item}
                    onPress={() => setColor(item)}
                    style={[styles.colorOption, { backgroundColor: item }, item === color && styles.colorSelected]}
                  />
                ))}
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label={routine ? 'Salvar alteracoes' : 'Criar rotina'} icon={Save} loading={saving} onPress={handleSubmit} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.66)',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: spacing.xs,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceStrong,
  },
  form: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  textArea: {
    minHeight: 82,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 13, 31, 0.72)',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  colorOption: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: colors.white,
  },
  error: {
    color: colors.danger,
    fontSize: typography.small,
    fontWeight: '700',
  },
});
