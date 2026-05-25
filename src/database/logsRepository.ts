import type { RoutineLog } from '../types';
import { todayKey } from '../utils/date';
import { createId } from '../utils/id';
import { getDatabase } from './database';

function nowIso() {
  return new Date().toISOString();
}

export async function getLogsByDate(date: string) {
  const db = await getDatabase();

  return db.getAllAsync<RoutineLog>('SELECT * FROM routine_logs WHERE date = ? ORDER BY created_at ASC', [date]);
}

export async function getLogsForRange(startDate: string, endDate: string) {
  const db = await getDatabase();

  return db.getAllAsync<RoutineLog>(
    `
      SELECT *
      FROM routine_logs
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC, created_at ASC
    `,
    [startDate, endDate],
  );
}

export async function getAllLogs() {
  const db = await getDatabase();

  return db.getAllAsync<RoutineLog>(
    `
      SELECT *
      FROM routine_logs
      ORDER BY date ASC, created_at ASC
    `,
  );
}

export async function setRoutineCompletion(routineId: string, date: string, completed: boolean) {
  const db = await getDatabase();
  const timestamp = nowIso();
  const routine = await db.getFirstAsync<{ name: string }>('SELECT name FROM routines WHERE id = ?', [routineId]);
  const existing = await db.getFirstAsync<RoutineLog>('SELECT * FROM routine_logs WHERE routine_id = ? AND date = ?', [routineId, date]);

  if (!routine) {
    throw new Error('Rotina nao encontrada.');
  }

  if (existing) {
    await db.runAsync(
      `
        UPDATE routine_logs
        SET completed = ?,
            routine_name_snapshot = CASE
              WHEN ? = 1 THEN ?
              ELSE routine_name_snapshot
            END,
            completed_at = ?,
            updated_at = ?
        WHERE id = ?
      `,
      [completed ? 1 : 0, completed ? 1 : 0, routine.name, completed ? timestamp : null, timestamp, existing.id],
    );
    return completed;
  }

  if (!completed) {
    return false;
  }

  await db.runAsync(
    `
      INSERT INTO routine_logs (
        id,
        routine_id,
        routine_name_snapshot,
        date,
        completed,
        completed_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, 1, ?, ?, ?)
    `,
    [createId('log'), routineId, routine.name, date, timestamp, timestamp, timestamp],
  );

  return true;
}

export async function toggleRoutineCompletion(routineId: string, date = todayKey()) {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<RoutineLog>(
    'SELECT * FROM routine_logs WHERE routine_id = ? AND date = ?',
    [routineId, date],
  );

  return setRoutineCompletion(routineId, date, existing?.completed !== 1);
}

export async function countLogs() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) as total FROM routine_logs');

  return row?.total ?? 0;
}
