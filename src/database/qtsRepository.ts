import type {
  Activity,
  ActivityFormValues,
  ActivityWithSchedules,
  DailyLog,
  PlannedActivityItem,
  StudySession,
  WeeklySchedule,
} from '../types';
import { parseDateKey, todayKey } from '../utils/date';
import { createId } from '../utils/id';
import { getDatabase } from './database';

function nowIso() {
  return new Date().toISOString();
}

type PlannedRow = Activity & {
  schedule_id: string;
  schedule_activity_id: string;
  weekday: number;
  has_fixed_time: number;
  start_time: string | null;
  end_time: string | null;
  reminder_time: string | null;
  schedule_is_active: number;
  schedule_created_at: string;
  schedule_updated_at: string;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
};

function normalizeActivityInput(values: ActivityFormValues) {
  return {
    name: values.name.trim(),
    description: values.description?.trim() || null,
    category_id: values.category_id || null,
    category: values.category?.trim() || null,
    icon: values.icon ?? null,
    color: values.color ?? null,
    type: values.type || 'habit',
    weekdays: values.weekdays.length > 0 ? values.weekdays : [0, 1, 2, 3, 4, 5, 6],
    has_fixed_time: values.has_fixed_time ? 1 : 0,
    start_time: values.has_fixed_time ? values.start_time || null : null,
    end_time: values.has_fixed_time ? values.end_time || null : null,
    reminder_time: values.reminder_time || null,
    is_active: values.is_active === false ? 0 : 1,
  };
}

export async function getActivities(includeArchived = false) {
  const db = await getDatabase();

  return db.getAllAsync<Activity>(
    `
      SELECT
        a.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM activities a
      LEFT JOIN categories c ON c.id = a.category_id
      ${includeArchived ? '' : 'WHERE a.archived_at IS NULL'}
      ORDER BY a.archived_at IS NOT NULL ASC, c.sort_order ASC, a.is_active DESC, a.name ASC
    `,
  );
}

export async function getStudyActivities() {
  const db = await getDatabase();

  return db.getAllAsync<Activity>(
    `
      SELECT
        a.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM activities a
      LEFT JOIN categories c ON c.id = a.category_id
      WHERE a.archived_at IS NULL AND a.is_active = 1
      ORDER BY
        CASE WHEN lower(c.name) = 'estudos' THEN 0 ELSE 1 END,
        CASE WHEN a.type = 'study' THEN 0 ELSE 1 END,
        c.sort_order ASC,
        a.name ASC
    `,
  );
}

export async function countActivities() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) as total FROM activities');

  return row?.total ?? 0;
}

export async function getActivitiesWithSchedules(includeArchived = false): Promise<ActivityWithSchedules[]> {
  const db = await getDatabase();
  const [activities, schedules] = await Promise.all([
    getActivities(includeArchived),
    db.getAllAsync<WeeklySchedule>(
      `
        SELECT *
        FROM weekly_schedules
        ORDER BY weekday ASC, has_fixed_time DESC, start_time ASC, created_at ASC
      `,
    ),
  ]);

  return activities.map((activity) => ({
    ...activity,
    schedules: schedules.filter((schedule) => schedule.activity_id === activity.id && schedule.is_active === 1),
  }));
}

export async function createActivity(values: ActivityFormValues) {
  const db = await getDatabase();
  const normalized = normalizeActivityInput(values);
  const category = await resolveCategory(db, normalized.category_id);
  const categoryId = category?.id ?? normalized.category_id ?? null;
  const categoryName = category?.name ?? normalized.category;
  const timestamp = nowIso();
  const activity: Activity = {
    id: createId('activity'),
    name: normalized.name,
    description: normalized.description,
    category_id: categoryId,
    category: categoryName,
    icon: normalized.icon,
    color: normalized.color,
    type: normalized.type,
    is_active: normalized.is_active,
    archived_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
        INSERT INTO activities (
          id, name, description, category_id, category, icon, color, type,
          is_active, archived_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
      `,
      [
        activity.id,
        activity.name,
        activity.description,
        activity.category_id,
        activity.category,
        activity.icon,
        activity.color,
        activity.type,
        activity.is_active,
        activity.created_at,
        activity.updated_at,
      ],
    );

    await insertSchedules(db, activity.id, normalized, timestamp);
  });

  return activity;
}

export async function updateActivity(id: string, values: ActivityFormValues) {
  const db = await getDatabase();
  const normalized = normalizeActivityInput(values);
  const category = await resolveCategory(db, normalized.category_id);
  const categoryId = category?.id ?? normalized.category_id ?? null;
  const categoryName = category?.name ?? normalized.category;
  const timestamp = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
        UPDATE activities
        SET name = ?,
            description = ?,
            category_id = ?,
            category = ?,
            icon = ?,
            color = ?,
            type = ?,
            is_active = ?,
            updated_at = ?
        WHERE id = ? AND archived_at IS NULL
      `,
      [
        normalized.name,
        normalized.description,
        categoryId,
        categoryName,
        normalized.icon,
        normalized.color,
        normalized.type,
        normalized.is_active,
        timestamp,
        id,
      ],
    );

    await db.runAsync('UPDATE weekly_schedules SET is_active = 0, updated_at = ? WHERE activity_id = ?', [timestamp, id]);
    await insertSchedules(db, id, normalized, timestamp);
  });
}

async function insertSchedules(
  db: Awaited<ReturnType<typeof getDatabase>>,
  activityId: string,
  values: ReturnType<typeof normalizeActivityInput>,
  timestamp: string,
) {
  for (const weekday of values.weekdays) {
    await db.runAsync(
      `
        INSERT INTO weekly_schedules (
          id, activity_id, weekday, has_fixed_time, start_time, end_time,
          reminder_time, is_active, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `,
      [
        createId('schedule'),
        activityId,
        weekday,
        values.has_fixed_time,
        values.start_time,
        values.end_time,
        values.reminder_time,
        timestamp,
        timestamp,
      ],
    );
  }
}

async function resolveCategory(db: Awaited<ReturnType<typeof getDatabase>>, categoryId: string | null) {
  if (categoryId) {
    const category = await db.getFirstAsync<{ id: string; name: string }>(
      'SELECT id, name FROM categories WHERE id = ? AND archived_at IS NULL',
      [categoryId],
    );

    if (category) {
      return category;
    }
  }

  return db.getFirstAsync<{ id: string; name: string }>("SELECT id, name FROM categories WHERE archived_at IS NULL AND name = 'Geral'");
}

export async function setActivityActive(id: string, isActive: boolean) {
  const db = await getDatabase();

  await db.runAsync('UPDATE activities SET is_active = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL', [
    isActive ? 1 : 0,
    nowIso(),
    id,
  ]);
}

export async function archiveActivity(id: string) {
  const db = await getDatabase();
  const timestamp = nowIso();

  await db.runAsync('UPDATE activities SET is_active = 0, archived_at = COALESCE(archived_at, ?), updated_at = ? WHERE id = ?', [
    timestamp,
    timestamp,
    id,
  ]);
}

export async function getPlannedItemsForDate(date: string): Promise<PlannedActivityItem[]> {
  const db = await getDatabase();
  const weekday = parseDateKey(date).getDay();
  const [rows, logs] = await Promise.all([
    db.getAllAsync<PlannedRow>(
      `
        SELECT
          a.*,
          c.name as category_name,
          c.icon as category_icon,
          c.color as category_color,
          s.id as schedule_id,
          s.activity_id as schedule_activity_id,
          s.weekday,
          s.has_fixed_time,
          s.start_time,
          s.end_time,
          s.reminder_time,
          s.is_active as schedule_is_active,
          s.created_at as schedule_created_at,
          s.updated_at as schedule_updated_at
        FROM weekly_schedules s
        INNER JOIN activities a ON a.id = s.activity_id
        LEFT JOIN categories c ON c.id = a.category_id
        WHERE s.weekday = ?
          AND s.is_active = 1
          AND (a.is_active = 1 OR (a.archived_at IS NOT NULL AND substr(a.archived_at, 1, 10) > ?))
          AND a.created_at <= ?
          AND (a.archived_at IS NULL OR substr(a.archived_at, 1, 10) > ?)
        ORDER BY s.has_fixed_time DESC, s.start_time ASC, a.name ASC
      `,
      [weekday, date, `${date}T23:59:59.999Z`, date],
    ),
    db.getAllAsync<DailyLog>('SELECT * FROM daily_logs WHERE date = ?', [date]),
  ]);
  const today = todayKey();

  return rows.map((row) => {
    const schedule: WeeklySchedule = {
      id: row.schedule_id,
      activity_id: row.schedule_activity_id,
      weekday: row.weekday,
      has_fixed_time: row.has_fixed_time,
      start_time: row.start_time,
      end_time: row.end_time,
      reminder_time: row.reminder_time,
      is_active: Number(row.schedule_is_active),
      created_at: String(row.schedule_created_at),
      updated_at: String(row.schedule_updated_at),
    };
    const activity: Activity = {
      id: row.id,
      name: row.name,
      description: row.description,
      category_id: row.category_id,
      category: row.category,
      icon: row.icon,
      color: row.color,
      category_name: row.category_name,
      category_icon: row.category_icon,
      category_color: row.category_color,
      type: row.type,
      is_active: row.is_active,
      archived_at: row.archived_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
    const log =
      logs.find((item) => item.schedule_id === schedule.id) ??
      logs.find((item) => item.schedule_id === null && item.activity_id === activity.id) ??
      null;
    const status = log?.completed === 1 ? 'done' : date < today ? 'not_done' : date > today ? 'planned' : 'pending';

    return {
      activity,
      schedule,
      log,
      date,
      status,
    };
  });
}

export async function setPlannedItemCompleted(item: PlannedActivityItem, completed: boolean) {
  const db = await getDatabase();
  const timestamp = nowIso();
  const existing = item.log;

  if (existing) {
    await db.runAsync(
      'UPDATE daily_logs SET completed = ?, completed_at = ?, updated_at = ? WHERE id = ?',
      [completed ? 1 : 0, completed ? timestamp : null, timestamp, existing.id],
    );
    return;
  }

  await db.runAsync(
    `
      INSERT INTO daily_logs (
        id, activity_id, schedule_id, date, completed, completed_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      createId('daily_log'),
      item.activity.id,
      item.schedule.id,
      item.date,
      completed ? 1 : 0,
      completed ? timestamp : null,
      timestamp,
      timestamp,
    ],
  );
}

export async function getDailyLogsForRange(startDate: string, endDate: string) {
  const db = await getDatabase();

  return db.getAllAsync<DailyLog>(
    `
      SELECT *
      FROM daily_logs
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC, created_at ASC
    `,
    [startDate, endDate],
  );
}

export async function createStudySession(values: {
  activity: Activity | null;
  activityName: string;
  plannedFocusMinutes: number;
  plannedBreakMinutes: number;
  actualStudySeconds: number;
  focusBreaksCount: number;
  completed: boolean;
  startedAt: string;
  endedAt: string;
}) {
  const db = await getDatabase();
  const timestamp = nowIso();

  await db.runAsync(
    `
      INSERT INTO study_sessions (
        id, activity_id, activity_name_snapshot, started_at, ended_at,
        planned_focus_minutes, planned_break_minutes, actual_study_seconds,
        focus_breaks_count, completed, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      createId('study'),
      values.activity?.id ?? null,
      values.activityName,
      values.startedAt,
      values.endedAt,
      values.plannedFocusMinutes,
      values.plannedBreakMinutes,
      values.actualStudySeconds,
      values.focusBreaksCount,
      values.completed ? 1 : 0,
      timestamp,
      timestamp,
    ],
  );
}

export async function getStudySessionsForRange(startDate: string, endDate: string) {
  const db = await getDatabase();

  return db.getAllAsync<StudySession>(
    `
      SELECT
        s.*,
        c.id as category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM study_sessions s
      LEFT JOIN activities a ON a.id = s.activity_id
      LEFT JOIN categories c ON c.id = a.category_id
      WHERE substr(s.started_at, 1, 10) >= ? AND substr(s.started_at, 1, 10) <= ?
      ORDER BY s.started_at ASC
    `,
    [startDate, endDate],
  );
}

export async function getAllStudySessions() {
  const db = await getDatabase();

  return db.getAllAsync<StudySession>(
    `
      SELECT
        s.*,
        c.id as category_id,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM study_sessions s
      LEFT JOIN activities a ON a.id = s.activity_id
      LEFT JOIN categories c ON c.id = a.category_id
      ORDER BY s.started_at ASC
    `,
  );
}
