import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { ChevronDown, Save, X } from 'lucide-react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { colors, radii, spacing, typography } from '../../theme';
import type { ActivityFormValues, ActivityWithSchedules, Category } from '../../types';

type RoutineFormModalProps = {
  visible: boolean;
  routine: ActivityWithSchedules | null;
  categories: Category[];
  saving: boolean;
  onClose: () => void;
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

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function RoutineFormModal({ visible, routine, categories, saving, onClose, onSubmit }: RoutineFormModalProps) {
  const firstSchedule = useMemo(() => routine?.schedules[0] ?? null, [routine]);
  const fixedSchedule = useMemo(() => routine?.schedules.find((item) => item.has_fixed_time === 1) ?? null, [routine]);
  const existingReminder = useMemo(() => routine?.schedules.find((item) => item.reminder_time)?.reminder_time ?? null, [routine]);
  const [name, setName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [hasFixedTime, setHasFixedTime] = useState(false);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:40');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    const query = normalizeCategory(categoryQuery);

    if (!query) {
      return categories;
    }

    return categories.filter((category) => normalizeCategory(category.name).includes(query));
  }, [categories, categoryQuery]);
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );
  const fallbackCategory = useMemo(
    () => categories.find((category) => normalizeCategory(category.name) === 'geral') ?? categories[0] ?? null,
    [categories],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const selectedWeekdays = [...new Set(routine?.schedules.map((schedule) => schedule.weekday) ?? [1, 2, 3, 4, 5])];
    const schedule = fixedSchedule ?? firstSchedule;
    const currentCategory = categories.find((category) => category.id === routine?.category_id) ?? fallbackCategory;

    setName(routine?.name ?? '');
    setSelectedCategoryId(currentCategory?.id ?? null);
    setCategoryQuery(currentCategory?.name ?? '');
    setCategoryOpen(false);
    setWeekdays(selectedWeekdays.length > 0 ? selectedWeekdays : [1, 2, 3, 4, 5]);
    setHasFixedTime(Boolean(fixedSchedule));
    setStartTime(schedule?.start_time ?? '08:00');
    setEndTime(schedule?.end_time ?? '08:40');
    setIsActive(routine ? routine.is_active === 1 : true);
    setError(null);
  }, [categories, fallbackCategory, firstSchedule, fixedSchedule, routine, visible]);

  function toggleWeekday(day: number) {
    setWeekdays((current) => {
      if (current.includes(day)) {
        return current.filter((item) => item !== day);
      }

      return [...current, day].sort((a, b) => a - b);
    });
  }

  function selectCategory(category: Category) {
    setSelectedCategoryId(category.id);
    setCategoryQuery(category.name);
    setCategoryOpen(false);
    setError(null);
  }

  function handleCategoryChange(value: string) {
    const exactCategory = categories.find((category) => normalizeCategory(category.name) === normalizeCategory(value));

    setCategoryQuery(value);
    setSelectedCategoryId(exactCategory?.id ?? null);
    setCategoryOpen(true);
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

    const category = selectedCategory ?? filteredCategories[0] ?? fallbackCategory;

    if (!category) {
      setError('Selecione uma categoria.');
      return;
    }

    if (hasFixedTime && (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime))) {
      setError('Preencha os horarios com 4 numeros, como 0800.');
      return;
    }

    await onSubmit({
      name,
      description: routine?.description ?? '',
      category_id: category.id,
      category: category.name,
      icon: null,
      color: null,
      type: isStudyCategory(category) ? 'study' : 'habit',
      weekdays,
      has_fixed_time: hasFixedTime,
      start_time: hasFixedTime ? startTime : null,
      end_time: hasFixedTime ? endTime : null,
      reminder_time: existingReminder,
      is_active: isActive,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{routine ? 'Editar rotina' : 'Nova rotina'}</Text>
              <Text style={styles.subtitle}>Nome, categoria, dias e horario</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X color={colors.text} size={20} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Leitura" />

            <CategorySelector
              value={categoryQuery}
              open={categoryOpen}
              categories={filteredCategories}
              onChangeText={handleCategoryChange}
              onToggle={() => setCategoryOpen((current) => !current)}
              onSelect={selectCategory}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Dias</Text>
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
                <Text style={styles.switchTitle}>Horario fixo</Text>
                <Text style={styles.switchSubtitle}>{hasFixedTime ? 'Aparece no QTS por horario.' : 'Aparece como sem horario.'}</Text>
              </View>
              <Switch
                value={hasFixedTime}
                onValueChange={setHasFixedTime}
                thumbColor={hasFixedTime ? colors.secondary : colors.textSubtle}
                trackColor={{ false: 'rgba(148, 163, 184, 0.18)', true: 'rgba(20, 184, 166, 0.28)' }}
              />
            </View>

            {hasFixedTime ? (
              <View style={styles.timeSection}>
                <Text style={styles.fieldLabel}>Horario</Text>
                <View style={styles.timeGrid}>
                  <TimeField label="Inicio" value={startTime} onChangeText={setStartTime} />
                  <TimeField label="Fim" value={endTime} onChangeText={setEndTime} />
                </View>
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label={routine ? 'Salvar' : 'Criar rotina'} icon={Save} loading={saving} onPress={handleSubmit} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CategorySelector({
  value,
  open,
  categories,
  onChangeText,
  onToggle,
  onSelect,
}: {
  value: string;
  open: boolean;
  categories: Category[];
  onChangeText: (value: string) => void;
  onToggle: () => void;
  onSelect: (category: Category) => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>Categoria</Text>
      <View style={styles.categoryInputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            if (!open) {
              onToggle();
            }
          }}
          placeholder="Digite ou escolha"
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.secondary}
          style={styles.categoryInput}
        />
        <Pressable accessibilityLabel="Mostrar categorias" onPress={onToggle} style={styles.categoryArrow}>
          <ChevronDown color={colors.textMuted} size={20} />
        </Pressable>
      </View>

      {open ? (
        <View style={styles.categoryMenu}>
          {categories.length === 0 ? (
            <Text style={styles.emptyCategory}>Nenhuma categoria encontrada.</Text>
          ) : (
            categories.map((category) => (
              <Pressable key={category.id} onPress={() => onSelect(category)} style={styles.categoryOption}>
                <Text style={styles.categoryOptionText} numberOfLines={1}>
                  {category.name}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

function TimeField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.timeField}>
      <TextField
        label={label}
        value={value}
        onChangeText={(text) => onChangeText(formatTimeInput(text))}
        placeholder="0800"
        keyboardType="number-pad"
        maxLength={5}
        style={styles.timeInput}
      />
    </View>
  );
}

function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function normalizeCategory(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .toLocaleLowerCase('pt-BR');
}

function isStudyCategory(category: Category) {
  return normalizeCategory(category.name).includes('estudo');
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.66)',
  },
  sheet: {
    maxHeight: '86%',
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
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
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
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  categoryInputWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(8, 13, 31, 0.86)',
  },
  categoryInput: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    minHeight: 50,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  categoryArrow: {
    width: 48,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryMenu: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    overflow: 'hidden',
  },
  categoryOption: {
    minHeight: 42,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(161, 161, 170, 0.1)',
    paddingHorizontal: spacing.md,
  },
  categoryOptionText: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: '800',
  },
  emptyCategory: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
    padding: spacing.md,
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
  timeSection: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  timeGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    width: '100%',
  },
  timeField: {
    flex: 1,
    maxWidth: 150,
  },
  timeInput: {
    textAlign: 'center',
    fontWeight: '900',
  },
  error: {
    color: colors.danger,
    fontSize: typography.small,
    fontWeight: '700',
  },
});
