import type { Category, CategoryFormValues } from '../types';
import { createId } from '../utils/id';
import { ROUTINE_COLORS, ROUTINE_ICONS } from '../utils/routineVisuals';
import { getDatabase } from './database';

function nowIso() {
  return new Date().toISOString();
}

function normalizeCategoryName(name: string) {
  return name.trim().replace(/\s+/g, '').toLocaleLowerCase('pt-BR');
}

function normalizeCategoryInput(values: CategoryFormValues) {
  return {
    name: values.name.trim(),
    description: values.description?.trim() || null,
    icon: values.icon || ROUTINE_ICONS.find((item) => item.key === 'target')?.key || ROUTINE_ICONS[0].key,
    color: values.color || ROUTINE_COLORS[0],
    sort_order: values.sort_order ?? 100,
  };
}

async function assertUniqueActiveName(name: string, exceptId?: string) {
  const db = await getDatabase();
  const categories = await db.getAllAsync<Category>('SELECT * FROM categories WHERE archived_at IS NULL');
  const normalized = normalizeCategoryName(name);
  const duplicate = categories.find((category) => category.id !== exceptId && normalizeCategoryName(category.name) === normalized);

  if (duplicate) {
    throw new Error('Ja existe uma categoria ativa com esse nome.');
  }
}

export async function getCategories(includeArchived = false) {
  const db = await getDatabase();

  return db.getAllAsync<Category>(
    `
      SELECT
        c.*,
        COUNT(a.id) as total_activity_count,
        SUM(CASE WHEN a.archived_at IS NULL AND a.is_active = 1 THEN 1 ELSE 0 END) as active_activity_count
      FROM categories c
      LEFT JOIN activities a ON a.category_id = c.id
      ${includeArchived ? '' : 'WHERE c.archived_at IS NULL'}
      GROUP BY c.id
      ORDER BY c.archived_at IS NOT NULL ASC, c.sort_order ASC, c.name ASC
    `,
  );
}

export async function getCategoryById(id: string) {
  const db = await getDatabase();

  return db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', [id]);
}

export async function createCategory(values: CategoryFormValues) {
  const db = await getDatabase();
  const normalized = normalizeCategoryInput(values);

  if (!normalized.name) {
    throw new Error('Informe um nome para a categoria.');
  }

  await assertUniqueActiveName(normalized.name);

  const timestamp = nowIso();
  const category: Category = {
    id: createId('category'),
    name: normalized.name,
    description: normalized.description,
    icon: normalized.icon,
    color: normalized.color,
    sort_order: normalized.sort_order,
    is_active: 1,
    archived_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  await db.runAsync(
    `
      INSERT INTO categories (
        id, name, description, icon, color, sort_order,
        is_active, archived_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 1, NULL, ?, ?)
    `,
    [
      category.id,
      category.name,
      category.description,
      category.icon,
      category.color,
      category.sort_order,
      category.created_at,
      category.updated_at,
    ],
  );

  return category;
}

export async function updateCategory(id: string, values: CategoryFormValues) {
  const db = await getDatabase();
  const normalized = normalizeCategoryInput(values);

  if (!normalized.name) {
    throw new Error('Informe um nome para a categoria.');
  }

  await assertUniqueActiveName(normalized.name, id);

  await db.runAsync(
    `
      UPDATE categories
      SET name = ?,
          description = ?,
          icon = ?,
          color = ?,
          sort_order = ?,
          updated_at = ?
      WHERE id = ? AND archived_at IS NULL
    `,
    [normalized.name, normalized.description, normalized.icon, normalized.color, normalized.sort_order, nowIso(), id],
  );
}

export async function archiveCategory(id: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) as total FROM activities WHERE category_id = ? AND archived_at IS NULL AND is_active = 1',
    [id],
  );

  if ((row?.total ?? 0) > 0) {
    throw new Error('Nao e possivel arquivar uma categoria com rotinas ativas.');
  }

  const timestamp = nowIso();

  await db.runAsync('UPDATE categories SET is_active = 0, archived_at = COALESCE(archived_at, ?), updated_at = ? WHERE id = ?', [
    timestamp,
    timestamp,
    id,
  ]);
}
