import type { DayStatus, MonthStats, Routine, RoutineLog } from '../types';
import {
  addDays,
  countExpectedRoutinesForDate,
  dateToKey,
  formatMonthYear,
  getDaysInMonth,
  getDaysOfMonth,
  getDateKeyFromIso,
  getLastNDays,
  getMonthRange,
  parseDateKey,
  wasRoutineAvailableOnDate,
} from './date';

export function getDayStatus(completedCount: number, activeRoutineCount: number): DayStatus {
  if (activeRoutineCount > 0 && completedCount >= activeRoutineCount) {
    return 'complete';
  }

  if (completedCount > 0) {
    return 'partial';
  }

  return 'empty';
}

export function buildMonthStats(routines: Routine[], logs: RoutineLog[], referenceDate = new Date()): MonthStats {
  const daysInMonth = getDaysInMonth(referenceDate);
  const completedLogs = logs.filter((log) => log.completed === 1);
  const monthDays = getDaysOfMonth(referenceDate);
  const range = getMonthRange(referenceDate);
  const completedRoutineIds = new Set(completedLogs.map((log) => log.routine_id));
  const routinesInMonth = routines.filter((routine) => {
    const createdKey = getDateKeyFromIso(routine.created_at);
    const archivedKey = getDateKeyFromIso(routine.archived_at);
    const overlapsMonth = (!createdKey || createdKey <= range.end) && (!archivedKey || archivedKey > range.start);

    return overlapsMonth || completedRoutineIds.has(routine.id);
  });

  const routineProgress = routinesInMonth.map((routine) => {
    const completed = completedLogs.filter((log) => log.routine_id === routine.id).length;
    const goalPercent = routine.monthly_goal_percent ?? 80;
    const availableDays = monthDays.filter((day) => wasRoutineAvailableOnDate(routine, day.key)).length;
    const goal = Math.max(1, Math.ceil((availableDays || daysInMonth) * (goalPercent / 100)));
    const percentage = goal > 0 ? Math.min(100, Math.round((completed / goal) * 100)) : 0;

    return {
      routine,
      completed,
      goal,
      goalPercent,
      percentage,
    };
  });

  const totalCompleted = routineProgress.reduce((sum, item) => sum + item.completed, 0);
  const totalGoal = routineProgress.reduce((sum, item) => sum + item.goal, 0);
  const overallProgress = totalGoal > 0 ? Math.min(100, Math.round((totalCompleted / totalGoal) * 100)) : 0;
  const averageProgress =
    routineProgress.length > 0
      ? Math.round(routineProgress.reduce((sum, item) => sum + item.percentage, 0) / routineProgress.length)
      : 0;

  const completedByDate = completedLogs.reduce<Record<string, number>>((acc, log) => {
    acc[log.date] = (acc[log.date] ?? 0) + 1;
    return acc;
  }, {});

  const completeDays = monthDays.filter((day) => {
    const expected = countExpectedRoutinesForDate(day.key, routines);
    return expected > 0 && (completedByDate[day.key] ?? 0) >= expected;
  }).length;

  const sortedByProgress = [...routineProgress].sort((a, b) => b.percentage - a.percentage);

  return {
    overallProgress,
    totalCompleted,
    totalGoal,
    averageProgress,
    completeDays,
    routineProgress,
    bestRoutine: sortedByProgress[0] ?? null,
    worstRoutine: sortedByProgress[sortedByProgress.length - 1] ?? null,
  };
}

export function calculateCurrentStreak(logs: RoutineLog[], referenceDate = new Date()) {
  const completedDates = new Set(logs.filter((log) => log.completed === 1).map((log) => log.date));
  let streak = 0;
  let cursor = referenceDate;

  while (completedDates.has(dateToKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function calculateCompleteRoutineStreak(routines: Routine[], logs: RoutineLog[], referenceDate = new Date()) {
  const completedByDate = logs.reduce<Record<string, Set<string>>>((acc, log) => {
    if (log.completed !== 1) {
      return acc;
    }

    acc[log.date] = acc[log.date] ?? new Set<string>();
    acc[log.date].add(log.routine_id);

    return acc;
  }, {});
  let streak = 0;
  let cursor = referenceDate;

  while (true) {
    const key = dateToKey(cursor);
    const expected = countExpectedRoutinesForDate(key, routines);

    if (expected === 0 || (completedByDate[key]?.size ?? 0) < expected) {
      break;
    }

    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function calculateBestCompleteRoutineStreak(routines: Routine[], logs: RoutineLog[], referenceDate = new Date()) {
  const firstRoutineDate = routines
    .map((routine) => getDateKeyFromIso(routine.created_at))
    .filter((dateKey): dateKey is string => Boolean(dateKey))
    .sort()[0];
  const firstLogDate = logs.map((log) => log.date).sort()[0];
  const startKey = [firstRoutineDate, firstLogDate].filter((dateKey): dateKey is string => Boolean(dateKey)).sort()[0];

  if (!startKey) {
    return 0;
  }

  const completedByDate = logs.reduce<Record<string, Set<string>>>((acc, log) => {
    if (log.completed !== 1) {
      return acc;
    }

    acc[log.date] = acc[log.date] ?? new Set<string>();
    acc[log.date].add(log.routine_id);

    return acc;
  }, {});
  let best = 0;
  let current = 0;
  let cursor = parseDateKey(startKey);
  const endKey = dateToKey(referenceDate);

  while (dateToKey(cursor) <= endKey) {
    const key = dateToKey(cursor);
    const expected = countExpectedRoutinesForDate(key, routines);
    const complete = expected > 0 && (completedByDate[key]?.size ?? 0) >= expected;

    current = complete ? current + 1 : 0;
    best = Math.max(best, current);
    cursor = addDays(cursor, 1);
  }

  return best;
}

export function countCompletedLogs(logs: RoutineLog[]) {
  return logs.filter((log) => log.completed === 1).length;
}

export function countExpectedCompletions(routines: Routine[], startDate: string, endDate: string) {
  let total = 0;
  let cursor = parseDateKey(startDate);

  while (dateToKey(cursor) <= endDate) {
    total += countExpectedRoutinesForDate(dateToKey(cursor), routines);
    cursor = addDays(cursor, 1);
  }

  return total;
}

export function calculateCompletionRate(routines: Routine[], logs: RoutineLog[], startDate: string, endDate: string) {
  const expected = countExpectedCompletions(routines, startDate, endDate);
  const completed = countCompletedLogs(logs.filter((log) => log.date >= startDate && log.date <= endDate));

  return {
    completed,
    expected,
    percentage: expected > 0 ? Math.min(100, Math.round((completed / expected) * 100)) : 0,
  };
}

export function getBestWeekday(logs: RoutineLog[]) {
  const labels = ['domingo', 'segunda-feira', 'terca-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sabado'];
  const totals = Array.from({ length: 7 }, (_, weekday) => ({ weekday, label: labels[weekday], total: 0 }));

  logs.forEach((log) => {
    if (log.completed !== 1) {
      return;
    }

    totals[parseDateKey(log.date).getDay()].total += 1;
  });

  const best = [...totals].sort((a, b) => b.total - a.total)[0] ?? null;

  return best && best.total > 0 ? best : null;
}

export function getBestMonth(logs: RoutineLog[]) {
  const totals = logs.reduce<Record<string, number>>((acc, log) => {
    if (log.completed !== 1) {
      return acc;
    }

    const monthKey = log.date.slice(0, 7);
    acc[monthKey] = (acc[monthKey] ?? 0) + 1;
    return acc;
  }, {});
  const [monthKey, total] = Object.entries(totals).sort(([, totalA], [, totalB]) => totalB - totalA)[0] ?? [];

  if (!monthKey) {
    return null;
  }

  return {
    monthKey,
    label: formatMonthYear(monthKey),
    total,
  };
}

export function buildMonthlyCompletionTotals(logs: RoutineLog[]) {
  const totals = logs.reduce<Record<string, number>>((acc, log) => {
    if (log.completed !== 1) {
      return acc;
    }

    const monthKey = log.date.slice(0, 7);
    acc[monthKey] = (acc[monthKey] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(totals)
    .sort(([monthA], [monthB]) => monthB.localeCompare(monthA))
    .map(([monthKey, total]) => ({
      monthKey,
      label: formatMonthYear(monthKey),
      total,
    }));
}

export function buildLastDaysCompletionTotals(logs: RoutineLog[], amount: number, referenceDate = new Date()) {
  const days = getLastNDays(amount, referenceDate);

  return days.map((day) => ({
    label: day.label,
    value: logs.filter((log) => log.date === day.key && log.completed === 1).length,
  }));
}

export function buildWeekdayCompletionRates(routines: Routine[], logs: RoutineLog[], startDate: string, endDate: string) {
  const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
  const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];
  const totals = weekdayOrder.map((weekday, index) => ({
    weekday,
    label: labels[index],
    completed: 0,
    planned: 0,
    percentage: 0,
  }));
  const totalsByWeekday = new Map(totals.map((item) => [item.weekday, item]));
  let cursor = parseDateKey(startDate);

  while (dateToKey(cursor) <= endDate) {
    const key = dateToKey(cursor);
    const weekday = cursor.getDay();
    const item = totalsByWeekday.get(weekday);

    if (item) {
      item.planned += countExpectedRoutinesForDate(key, routines);
      item.completed += logs.filter((log) => log.date === key && log.completed === 1).length;
    }

    cursor = addDays(cursor, 1);
  }

  return totals.map((item) => ({
    ...item,
    percentage: item.planned > 0 ? Math.min(100, Math.round((item.completed / item.planned) * 100)) : 0,
  }));
}
