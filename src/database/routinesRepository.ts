import type { Routine, RoutineFormValues } from '../types';
import { createId } from '../utils/id';
import { ROUTINE_COLORS, ROUTINE_ICONS } from '../utils/routineVisuals';
import { getDatabase, getMetaValue, setMetaValue } from './database';

function nowIso() {
  return new Date().toISOString();
}

function normalizeRoutineInput(values: RoutineFormValues) {
  const percent = values.monthly_goal_percent ?? 80;

  return {
    name: values.name.trim(),
    description: values.description?.trim() || null,
    category: values.category?.trim() || null,
    icon: values.icon || ROUTINE_ICONS[0].key,
    color: values.color || ROUTINE_COLORS[0],
    monthly_goal_percent: Math.min(100, Math.max(1, Math.round(percent))),
  };
}

export async function getRoutines(includeInactive = true) {
  const db = await getDatabase();

  return db.getAllAsync<Routine>(
    `
      SELECT *
      FROM routines
      ${includeInactive ? '' : 'WHERE is_active = 1'}
      ORDER BY is_active DESC, created_at ASC
    `,
  );
}

export async function getRoutineById(id: string) {
  const db = await getDatabase();

  return db.getFirstAsync<Routine>('SELECT * FROM routines WHERE id = ?', [id]);
}

export async function createRoutine(values: RoutineFormValues) {
  const db = await getDatabase();
  const normalized = normalizeRoutineInput(values);
  const timestamp = nowIso();
  const routine: Routine = {
    id: createId('routine'),
    name: normalized.name,
    description: normalized.description,
    category: normalized.category,
    icon: normalized.icon,
    color: normalized.color,
    frequency: 'daily',
    monthly_goal: null,
    monthly_goal_percent: normalized.monthly_goal_percent,
    is_active: 1,
    created_at: timestamp,
    updated_at: timestamp,
  };

  await db.runAsync(
    `
      INSERT INTO routines (
        id, name, description, category, icon, color, frequency,
        monthly_goal, monthly_goal_percent, is_active, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      routine.id,
      routine.name,
      routine.description,
      routine.category,
      routine.icon,
      routine.color,
      routine.frequency,
      routine.monthly_goal,
      routine.monthly_goal_percent,
      routine.is_active,
      routine.created_at,
      routine.updated_at,
    ],
  );

  return routine;
}

export async function updateRoutine(id: string, values: RoutineFormValues) {
  const db = await getDatabase();
  const current = await getRoutineById(id);

  if (!current) {
    throw new Error('Rotina nao encontrada.');
  }

  const normalized = normalizeRoutineInput(values);
  const updatedAt = nowIso();

  await db.runAsync(
    `
      UPDATE routines
      SET name = ?,
          description = ?,
          category = ?,
          icon = ?,
          color = ?,
          monthly_goal_percent = ?,
          updated_at = ?
      WHERE id = ?
    `,
    [
      normalized.name,
      normalized.description,
      normalized.category,
      normalized.icon,
      normalized.color,
      normalized.monthly_goal_percent,
      updatedAt,
      id,
    ],
  );
}

export async function setRoutineActive(id: string, isActive: boolean) {
  const db = await getDatabase();

  await db.runAsync('UPDATE routines SET is_active = ?, updated_at = ? WHERE id = ?', [
    isActive ? 1 : 0,
    nowIso(),
    id,
  ]);
}

export async function deleteRoutine(id: string) {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM routines WHERE id = ?', [id]);
}

export async function countRoutines() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) as total FROM routines');

  return row?.total ?? 0;
}

export async function seedInitialRoutines() {
  const alreadySeeded = await getMetaValue('initial_seed_done');

  if (alreadySeeded === '1') {
    return;
  }

  const total = await countRoutines();

  if (total === 0) {
    await createRoutine({
      name: 'Planejamento do dia',
      description: 'Definir prioridades antes de comecar.',
      category: 'Foco',
      icon: 'target',
      color: '#7C5CFF',
      monthly_goal_percent: 85,
    });
    await createRoutine({
      name: 'Treino ou caminhada',
      description: 'Movimento diario para manter energia.',
      category: 'Saude',
      icon: 'dumbbell',
      color: '#31D08A',
      monthly_goal_percent: 70,
    });
    await createRoutine({
      name: 'Leitura',
      description: 'Pelo menos 20 minutos de leitura.',
      category: 'Desenvolvimento',
      icon: 'book',
      color: '#F5B84B',
      monthly_goal_percent: 75,
    });
  }

  await setMetaValue('initial_seed_done', '1');
}
