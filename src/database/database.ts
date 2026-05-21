import * as SQLite from 'expo-sqlite';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('routine-control.db');
  }

  return databasePromise;
}

export async function initDatabase() {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      icon TEXT,
      color TEXT,
      frequency TEXT DEFAULT 'daily',
      monthly_goal INTEGER,
      monthly_goal_percent INTEGER DEFAULT 80,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routine_logs (
      id TEXT PRIMARY KEY,
      routine_id TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      UNIQUE(routine_id, date),
      FOREIGN KEY(routine_id) REFERENCES routines(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_routine_logs_date ON routine_logs(date);
    CREATE INDEX IF NOT EXISTS idx_routine_logs_routine_id ON routine_logs(routine_id);
  `);

  await migrateRoutinesTable(db);
}

async function migrateRoutinesTable(db: SQLite.SQLiteDatabase) {
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(routines)');
  const hasMonthlyGoalPercent = columns.some((column) => column.name === 'monthly_goal_percent');

  if (!hasMonthlyGoalPercent) {
    await db.runAsync('ALTER TABLE routines ADD COLUMN monthly_goal_percent INTEGER DEFAULT 80');
  }

  await db.runAsync('UPDATE routines SET monthly_goal_percent = 80 WHERE monthly_goal_percent IS NULL');
}

export async function getMetaValue(key: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', [key]);

  return row?.value ?? null;
}

export async function setMetaValue(key: string, value: string) {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO app_meta (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    [key, value],
  );
}

export async function clearDatabase() {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM routine_logs');
    await db.runAsync('DELETE FROM routines');
    await db.runAsync(
      `
        INSERT INTO app_meta (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `,
      ['initial_seed_done', '1'],
    );
  });
}
