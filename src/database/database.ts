import * as SQLite from 'expo-sqlite';

const SCHEMA_VERSION = 2;

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
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routine_logs (
      id TEXT PRIMARY KEY,
      routine_id TEXT NOT NULL,
      routine_name_snapshot TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 1,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(routine_id, date),
      FOREIGN KEY(routine_id) REFERENCES routines(id)
    );

    CREATE INDEX IF NOT EXISTS idx_routine_logs_date ON routine_logs(date);
    CREATE INDEX IF NOT EXISTS idx_routine_logs_routine_id ON routine_logs(routine_id);
  `);

  await migrateDatabase(db);
}

async function migrateDatabase(db: SQLite.SQLiteDatabase) {
  const parsedVersion = Number((await getMetaValueFromDb(db, 'schema_version')) ?? '1');
  const currentVersion = Number.isFinite(parsedVersion) ? parsedVersion : 1;

  if (currentVersion < SCHEMA_VERSION) {
    await createPreMigrationBackup(db, currentVersion);
  }

  await migrateRoutinesTable(db);
  await migrateRoutineLogsTable(db);
  await setMetaValueFromDb(db, 'schema_version', String(SCHEMA_VERSION));
}

async function migrateRoutinesTable(db: SQLite.SQLiteDatabase) {
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(routines)');
  const hasMonthlyGoalPercent = columns.some((column) => column.name === 'monthly_goal_percent');
  const hasArchivedAt = columns.some((column) => column.name === 'archived_at');

  if (!hasMonthlyGoalPercent) {
    await db.runAsync('ALTER TABLE routines ADD COLUMN monthly_goal_percent INTEGER DEFAULT 80');
  }

  if (!hasArchivedAt) {
    await db.runAsync('ALTER TABLE routines ADD COLUMN archived_at TEXT');
  }

  await db.runAsync('UPDATE routines SET monthly_goal_percent = 80 WHERE monthly_goal_percent IS NULL');
  await db.runAsync('UPDATE routines SET is_active = 1 WHERE is_active IS NULL');
}

async function migrateRoutineLogsTable(db: SQLite.SQLiteDatabase) {
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(routine_logs)');
  const foreignKeys = await db.getAllAsync<{ on_delete: string }>('PRAGMA foreign_key_list(routine_logs)');
  const columnNames = new Set(columns.map((column) => column.name));
  const hasSnapshot = columnNames.has('routine_name_snapshot');
  const hasCompletedAt = columnNames.has('completed_at');
  const hasUpdatedAt = columnNames.has('updated_at');
  const hasCascadeDelete = foreignKeys.some((foreignKey) => foreignKey.on_delete?.toUpperCase() === 'CASCADE');

  if (!hasSnapshot || !hasCompletedAt || !hasUpdatedAt || hasCascadeDelete) {
    await rebuildRoutineLogsTable(db, {
      hasSnapshot,
      hasCompletedAt,
      hasUpdatedAt,
    });
    return;
  }

  await db.runAsync(`
    UPDATE routine_logs
    SET routine_name_snapshot = COALESCE(NULLIF(routine_name_snapshot, ''), (
          SELECT name FROM routines WHERE routines.id = routine_logs.routine_id
        ), 'Rotina sem nome'),
        completed_at = CASE
          WHEN completed = 1 AND completed_at IS NULL THEN created_at
          ELSE completed_at
        END,
        updated_at = COALESCE(updated_at, created_at)
  `);
}

async function rebuildRoutineLogsTable(
  db: SQLite.SQLiteDatabase,
  existingColumns: {
    hasSnapshot: boolean;
    hasCompletedAt: boolean;
    hasUpdatedAt: boolean;
  },
) {
  const backupTableName = `routine_logs_backup_${Date.now()}`;
  const snapshotExpression = existingColumns.hasSnapshot
    ? "COALESCE(NULLIF(old.routine_name_snapshot, ''), routines.name, 'Rotina sem nome')"
    : "COALESCE(routines.name, 'Rotina sem nome')";
  const completedAtExpression = existingColumns.hasCompletedAt
    ? 'old.completed_at'
    : 'CASE WHEN COALESCE(old.completed, 1) = 1 THEN old.created_at ELSE NULL END';
  const updatedAtExpression = existingColumns.hasUpdatedAt ? 'COALESCE(old.updated_at, old.created_at)' : 'old.created_at';

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      ALTER TABLE routine_logs RENAME TO ${backupTableName};

      CREATE TABLE routine_logs (
        id TEXT PRIMARY KEY,
        routine_id TEXT NOT NULL,
        routine_name_snapshot TEXT NOT NULL,
        date TEXT NOT NULL,
        completed INTEGER DEFAULT 1,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(routine_id, date)
      );
    `);

    await db.runAsync(`
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
      SELECT
        old.id,
        old.routine_id,
        ${snapshotExpression},
        old.date,
        COALESCE(old.completed, 1),
        ${completedAtExpression},
        old.created_at,
        ${updatedAtExpression}
      FROM ${backupTableName} old
      LEFT JOIN routines ON routines.id = old.routine_id
    `);

    await db.execAsync(`
      DROP TABLE ${backupTableName};
      CREATE INDEX IF NOT EXISTS idx_routine_logs_date ON routine_logs(date);
      CREATE INDEX IF NOT EXISTS idx_routine_logs_routine_id ON routine_logs(routine_id);
    `);
  });
}

async function createPreMigrationBackup(db: SQLite.SQLiteDatabase, fromVersion: number) {
  const backupKey = `pre_migration_backup_v${fromVersion}_to_v${SCHEMA_VERSION}`;
  const existingBackup = await getMetaValueFromDb(db, backupKey);

  if (existingBackup) {
    return;
  }

  const [routines, routineLogs, appMeta] = await Promise.all([
    db.getAllAsync('SELECT * FROM routines ORDER BY created_at ASC'),
    db.getAllAsync('SELECT * FROM routine_logs ORDER BY date ASC, created_at ASC'),
    db.getAllAsync('SELECT * FROM app_meta ORDER BY key ASC'),
  ]);

  await setMetaValueFromDb(
    db,
    backupKey,
    JSON.stringify({
      exported_at: new Date().toISOString(),
      from_schema_version: fromVersion,
      to_schema_version: SCHEMA_VERSION,
      routines,
      routine_logs: routineLogs,
      app_meta: appMeta,
    }),
  );
}

export async function getMetaValue(key: string) {
  const db = await getDatabase();

  return getMetaValueFromDb(db, key);
}

export async function setMetaValue(key: string, value: string) {
  const db = await getDatabase();

  await setMetaValueFromDb(db, key, value);
}

async function getMetaValueFromDb(db: SQLite.SQLiteDatabase, key: string) {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', [key]);

  return row?.value ?? null;
}

async function setMetaValueFromDb(db: SQLite.SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    `
      INSERT INTO app_meta (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    [key, value],
  );
}

export async function exportDatabaseSnapshot() {
  const db = await getDatabase();
  const [appMeta, routines, routineLogs] = await Promise.all([
    db.getAllAsync('SELECT * FROM app_meta ORDER BY key ASC'),
    db.getAllAsync('SELECT * FROM routines ORDER BY created_at ASC'),
    db.getAllAsync('SELECT * FROM routine_logs ORDER BY date ASC, created_at ASC'),
  ]);

  return JSON.stringify(
    {
      app: 'Controle de Habitos',
      exported_at: new Date().toISOString(),
      schema_version: SCHEMA_VERSION,
      app_meta: appMeta,
      routines,
      routine_logs: routineLogs,
    },
    null,
    2,
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
