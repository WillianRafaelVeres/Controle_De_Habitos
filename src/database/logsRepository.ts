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

export async function toggleRoutineCompletion(routineId: string, date = todayKey()) {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<RoutineLog>(
    'SELECT * FROM routine_logs WHERE routine_id = ? AND date = ?',
    [routineId, date],
  );
  const nextCompleted = existing?.completed === 1 ? 0 : 1;

  if (existing) {
    await db.runAsync('UPDATE routine_logs SET completed = ? WHERE id = ?', [nextCompleted, existing.id]);
    return nextCompleted === 1;
  }

  await db.runAsync(
    `
      INSERT INTO routine_logs (id, routine_id, date, completed, created_at)
      VALUES (?, ?, ?, 1, ?)
    `,
    [createId('log'), routineId, date, nowIso()],
  );

  return true;
}

export async function countLogs() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) as total FROM routine_logs');

  return row?.total ?? 0;
}
