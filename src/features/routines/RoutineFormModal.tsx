import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Save, X } from 'lucide-react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { colors, radii, spacing, typography } from '../../theme';
import type { ActivityFormValues, ActivityType, ActivityWithSchedules, Category, CategoryFormValues } from '../../types';
import { ROUTINE_COLORS, ROUTINE_ICONS } from '../../utils/routineVisuals';

type RoutineFormModalProps = {
  visible: boolean;
  routine: ActivityWithSchedules | null;
  categories: Category[];
  saving: boolean;
  onClose: () => void;
  onCreateCategory: (values: CategoryFormValues) => Promise<Category>;
  onSubmit: (values: ActivityFormValues) => Promise<void>;
};

const WEEKDAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sab' },
];

const ACTIVITY_TYPES: Array<{ value: ActivityType; label: string }> = [
  { value: 'study', label: 'Estudo' },
  { value: 'habit', label: 'Habito' },
  { value: 'task', label: 'Tarefa' },
  { value: 'prayer', label: 'Oracao' },
  { value: 'exercise', label: 'Exercicio' },
  { value: 'work', label: 'Trabalho' },
  { value: 'other', label: 'Outro' },
];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function RoutineFormModal({ visible, routine, categories, saving, onClose, onCreateCategory, onSubmit }: RoutineFormModalProps) {
  const firstSchedule = useMemo(() => routine?.schedules[0] ?? null, [routine]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [type, setType] = useState<ActivityType>('habit');
  const [icon, setIcon] = useState(ROUTINE_ICONS[0].key);
  const [color, setColor] = useState(ROUTINE_COLORS[0]);
  const [customVisual, setCustomVisual] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [hasFixedTime, setHasFixedTime] = useState(false);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:40');
  const [reminderTime, setReminderTime] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? categories[0] ?? null,
    [categories, selectedCategoryId],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const selectedWeekdays = routine?.schedules.map((schedule) => schedule.weekday) ?? [1, 2, 3, 4, 5];
    const schedule = routine?.schedules.find((item) => item.has_fixed_time === 1) ?? firstSchedule;
    const currentCategory = categories.find((category) => category.id === routine?.category_id) ?? categories[0] ?? null;
    const hasOwnVisual = Boolean(routine?.icon || routine?.color);

    setName(routine?.name ?? '');
    setDescription(routine?.description ?? '');
    setSelectedCategoryId(currentCategory?.id ?? null);
    setQuickCategoryName('');
    setType(routine?.type ?? 'habit');
    setIcon(routine?.icon ?? currentCategory?.icon ?? ROUTINE_ICONS[0].key);
    setColor(routine?.color ?? currentCategory?.color ?? ROUTINE_COLORS[0]);
    setCustomVisual(hasOwnVisual);
    setWeekdays(selectedWeekdays.length > 0 ? selectedWeekdays : [1, 2, 3, 4, 5]);
    setHasFixedTime(schedule?.has_fixed_time === 1);
    setStartTime(schedule?.start_time ?? '08:00');
    setEndTime(schedule?.end_time ?? '08:40');
    setReminderTime(schedule?.reminder_time ?? '');
    setIsActive(routine ? routine.is_active === 1 : true);
    setError(null);
  }, [categories, firstSchedule, routine, visible]);

  function selectCategory(category: Category) {
    setSelectedCategoryId(category.id);

    if (!customVisual) {
      setIcon(category.icon ?? ROUTINE_ICONS[0].key);
      setColor(category.color ?? ROUTINE_COLORS[0]);
    }
  }

  async function handleQuickCreateCategory() {
    if (!quickCategoryName.trim()) {
      setError('Informe o nome da nova categoria.');
      return;
    }

    try {
      const category = await onCreateCategory({
        name: quickCategoryName,
        icon: 'target',
        color: ROUTINE_COLORS[0],
      });

      setQuickCategoryName('');
      setSelectedCategoryId(category.id);
      setIcon(category.icon ?? ROUTINE_ICONS[0].key);
      setColor(category.color ?? ROUTINE_COLORS[0]);
      setCustomVisual(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel criar a categoria.');
    }
  }

  function toggleWeekday(day: number) {
    setWeekdays((current) => {
      if (current.includes(day)) {
        return current.filter((item) => item !== day);
      }

      return [...current, day].sort((a, b) => a - b);
    });
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Informe um nome para a rotina.');
      return;
    }

    if (weekdays.length === 0) {
      setError('Selecione pelo menos um dia da semana.');
      return;
    }

    if (!selectedCategory?.id) {
      setError('Selecione uma categoria.');
      return;
    }

    if (hasFixedTime && (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime))) {
      setError('Use horarios no formato HH:MM.');
      return;
    }

    if (reminderTime.trim() && !TIME_PATTERN.test(reminderTime.trim())) {
      setError('Use o lembrete no formato HH:MM ou deixe em branco.');
      return;
    }

    await onSubmit({
      name,
      description,
      category_id: selectedCategory.id,
      category: selectedCategory.name,
      icon: customVisual ? icon : null,
      color: customVisual ? color : null,
      type,
      weekdays,
      has_fixed_time: hasFixedTime,
      start_time: hasFixedTime ? startTime : null,
      end_time: hasFixedTime ? endTime : null,
      reminder_time: reminderTime.trim() || null,
      is_active: isActive,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{routine ? 'Editar rotina' : 'Nova rotina'}</Text>
              <Text style={styles.subtitle}>Planejamento semanal</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X color={colors.text} size={20} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
            <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Espanhol" />
            <TextField
              label="Descricao opcional"
              value={description}
              onChangeText={setDescription}
              placeholder="Detalhe rapido da rotina"
              multiline
              style={styles.textArea}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Categoria</Text>
              <View style={styles.categoryGrid}>
                {categories.map((category) => {
                  const selected = category.id === selectedCategory?.id;

                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => selectCategory(category)}
                      style={[
                        styles.categoryPill,
                        { borderColor: selected ? category.color ?? colors.secondary : colors.border },
                        selected && { backgroundColor: `${category.color ?? colors.secondary}18` },
                      ]}
                    >
                      <Text style={[styles.categoryText, selected && styles.categoryTextActive]} numberOfLines={1}>
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.quickCategory}>
                <TextField
                  label="Nova categoria rapida"
                  value={quickCategoryName}
                  onChangeText={setQuickCategoryName}
                  placeholder="Ex.: Estudos"
                />
                <PrimaryButton label="Criar" onPress={handleQuickCreateCategory} variant="secondary" />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Tipo</Text>
              <View style={styles.optionGrid}>
                {ACTIVITY_TYPES.map((item) => (
                  <Pressable
                    key={item.value}
                    onPress={() => setType(item.value)}
                    style={[styles.optionPill, type === item.value && styles.optionPillActive]}
                  >
                    <Text style={[styles.optionText, type === item.value && styles.optionTextActive]}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Dias da semana</Text>
              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((day) => {
                  const selected = weekdays.includes(day.value);

                  return (
                    <Pressable
                      key={day.value}
                      onPress={() => toggleWeekday(day.value)}
                      style={[styles.weekdayButton, selected && styles.weekdayButtonActive]}
                    >
                      <Text style={[styles.weekdayText, selected && styles.weekdayTextActive]}>{day.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchTitle}>Tem horario fixo?</Text>
                <Text style={styles.switchSubtitle}>{hasFixedTime ? 'Aparece no QTS por horario.' : 'Aparece em sem horario fixo.'}</Text>
              </View>
              <Switch
                value={hasFixedTime}
                onValueChange={setHasFixedTime}
                thumbColor={hasFixedTime ? colors.secondary : colors.textSubtle}
                trackColor={{ false: 'rgba(148, 163, 184, 0.18)', true: 'rgba(20, 184, 166, 0.28)' }}
              />
            </View>

            {hasFixedTime ? (
              <View style={styles.timeGrid}>
                <TextField label="Inicio" value={startTime} onChangeText={setStartTime} placeholder="08:00" keyboardType="numbers-and-punctuation" />
                <TextField label="Fim" value={endTime} onChangeText={setEndTime} placeholder="08:40" keyboardType="numbers-and-punctuation" />
              </View>
            ) : null}

            <TextField
              label="Lembrete opcional"
              value={reminderTime}
              onChangeText={setReminderTime}
              placeholder="Ex.: 21:00"
              keyboardType="numbers-and-punctuation"
            />

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchTitle}>Rotina ativa</Text>
                <Text style={styles.switchSubtitle}>Rotinas inativas nao aparecem em Hoje.</Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                thumbColor={isActive ? colors.secondary : colors.textSubtle}
                trackColor={{ false: 'rgba(148, 163, 184, 0.18)', true: 'rgba(20, 184, 166, 0.28)' }}
              />
            </View>

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
                      onPress={() => {
                        setIcon(item.key);
                        setCustomVisual(true);
                      }}
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
                    onPress={() => {
                      setColor(item);
                      setCustomVisual(true);
                    }}
                    style={[styles.colorOption, { backgroundColor: item }, item === color && styles.colorSelected]}
                  />
                ))}
              </View>
              {customVisual ? (
                <Pressable
                  onPress={() => {
                    setCustomVisual(false);
                    setIcon(selectedCategory?.icon ?? ROUTINE_ICONS[0].key);
                    setColor(selectedCategory?.color ?? ROUTINE_COLORS[0]);
                  }}
                  style={styles.inheritButton}
                >
                  <Text style={styles.inheritText}>Usar visual da categoria</Text>
                </Pressable>
              ) : (
                <Text style={styles.inheritHint}>Herdando cor e icone da categoria.</Text>
              )}
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryPill: {
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(161, 161, 170, 0.06)',
  },
  categoryText: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '800',
  },
  categoryTextActive: {
    color: colors.text,
  },
  quickCategory: {
    gap: spacing.sm,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(161, 161, 170, 0.06)',
  },
  optionPillActive: {
    borderColor: colors.secondary,
    backgroundColor: 'rgba(20, 184, 166, 0.14)',
  },
  optionText: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '800',
  },
  optionTextActive: {
    color: colors.text,
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  weekdayButton: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(161, 161, 170, 0.06)',
  },
  weekdayButtonActive: {
    borderColor: colors.secondary,
    backgroundColor: 'rgba(20, 184, 166, 0.14)',
  },
  weekdayText: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: '900',
  },
  weekdayTextActive: {
    color: colors.text,
  },
  switchRow: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: 'rgba(161, 161, 170, 0.06)',
  },
  switchCopy: {
    flex: 1,
    minWidth: 0,
  },
  switchTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },
  switchSubtitle: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    marginTop: spacing.xs,
  },
  timeGrid: {
    flexDirection: 'row',
    gap: spacing.md,
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
  inheritButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(161, 161, 170, 0.06)',
  },
  inheritText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '800',
  },
  inheritHint: {
    color: colors.textSubtle,
    fontSize: typography.tiny,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: typography.small,
    fontWeight: '700',
  },
});
