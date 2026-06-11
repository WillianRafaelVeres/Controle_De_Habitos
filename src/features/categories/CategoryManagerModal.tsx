import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Archive, Edit3, Plus, Save, X } from 'lucide-react-native';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { archiveCategory, createCategory, getCategories, updateCategory } from '../../database';
import { colors, radii, spacing, typography } from '../../theme';
import type { Category } from '../../types';
import { getCategoryColor, getCategoryIcon, ROUTINE_COLORS, ROUTINE_ICONS } from '../../utils/routineVisuals';

type CategoryManagerModalProps = {
  visible: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
};

export function CategoryManagerModal({ visible, onClose, onChanged }: CategoryManagerModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState(ROUTINE_ICONS[0].key);
  const [color, setColor] = useState(ROUTINE_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setCategories(await getCategories(true));
  }, []);

  useEffect(() => {
    if (visible) {
      loadCategories();
      resetForm();
    }
  }, [loadCategories, visible]);

  function resetForm() {
    setEditingCategory(null);
    setFormVisible(false);
    setName('');
    setDescription('');
    setIcon(ROUTINE_ICONS[0].key);
    setColor(ROUTINE_COLORS[0]);
    setError(null);
  }

  function openCreate() {
    setEditingCategory(null);
    setFormVisible(true);
    setName('');
    setDescription('');
    setIcon(ROUTINE_ICONS[0].key);
    setColor(ROUTINE_COLORS[0]);
    setError(null);
  }

  function openEdit(category: Category) {
    setEditingCategory(category);
    setFormVisible(true);
    setName(category.name);
    setDescription(category.description ?? '');
    setIcon(category.icon ?? ROUTINE_ICONS[0].key);
    setColor(category.color ?? ROUTINE_COLORS[0]);
    setError(null);
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Informe o nome da categoria.');
      return;
    }

    setSaving(true);

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, { name, description, icon, color, sort_order: editingCategory.sort_order });
      } else {
        await createCategory({ name, description, icon, color, sort_order: categories.length * 10 + 100 });
      }

      await loadCategories();
      await onChanged();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel salvar a categoria.');
    } finally {
      setSaving(false);
    }
  }

  function handleArchive(category: Category) {
    Alert.alert('Arquivar categoria', `Arquivar "${category.name}"? Categorias com rotinas ativas nao podem ser arquivadas.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Arquivar',
        style: 'destructive',
        onPress: async () => {
          try {
            await archiveCategory(category.id);
            await loadCategories();
            await onChanged();
            resetForm();
          } catch (err) {
            Alert.alert('Categoria em uso', err instanceof Error ? err.message : 'Nao foi possivel arquivar esta categoria.');
          }
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Categorias</Text>
              <Text style={styles.subtitle}>Padronize cor e icone das rotinas</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X color={colors.text} size={20} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {formVisible ? (
              <Card style={styles.formCard}>
                <Text style={styles.formTitle}>{editingCategory ? 'Editar categoria' : 'Nova categoria'}</Text>
                <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Estudos" />
                <TextField
                  label="Descricao opcional"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Ex.: Cursos, materias e leitura"
                  multiline
                  style={styles.textArea}
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

                <View style={styles.formActions}>
                  <PrimaryButton label="Salvar" icon={Save} loading={saving} onPress={handleSave} style={styles.actionGrow} />
                  {editingCategory ? (
                    <PrimaryButton label="Arquivar" icon={Archive} variant="danger" onPress={() => handleArchive(editingCategory)} style={styles.actionGrow} />
                  ) : null}
                </View>
              </Card>
            ) : (
              <PrimaryButton label="Nova categoria" icon={Plus} onPress={openCreate} />
            )}

            <View style={styles.list}>
              {categories.map((category) => (
                <CategoryRow key={category.id} category={category} onEdit={() => openEdit(category)} />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CategoryRow({ category, onEdit }: { category: Category; onEdit: () => void }) {
  const accent = getCategoryColor(category);
  const Icon = getCategoryIcon(category);
  const isArchived = Boolean(category.archived_at);

  return (
    <Card style={[styles.categoryCard, isArchived && styles.archivedCard]}>
      <View style={[styles.categoryIcon, { backgroundColor: `${accent}22` }]}>
        <Icon color={accent} size={20} strokeWidth={2.4} />
      </View>
      <View style={styles.categoryCopy}>
        <Text style={styles.categoryName} numberOfLines={1}>
          {category.name}
        </Text>
        <Text style={styles.categoryMeta}>
          {category.active_activity_count ?? 0} rotinas ativas{isArchived ? ' - arquivada' : ''}
        </Text>
      </View>
      <Pressable onPress={onEdit} style={styles.editButton}>
        <Edit3 color={colors.textMuted} size={17} />
      </Pressable>
    </Card>
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
    alignItems: 'center',
    flexDirection: 'row',
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: colors.surfaceStrong,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  formCard: {
    gap: spacing.md,
  },
  formTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  textArea: {
    minHeight: 76,
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
  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionGrow: {
    flex: 1,
  },
  error: {
    color: colors.danger,
    fontSize: typography.small,
    fontWeight: '700',
  },
  list: {
    gap: spacing.md,
  },
  categoryCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  archivedCard: {
    opacity: 0.55,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCopy: {
    flex: 1,
    minWidth: 0,
  },
  categoryName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
  },
  categoryMeta: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  editButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: 'rgba(161, 161, 170, 0.08)',
  },
});
