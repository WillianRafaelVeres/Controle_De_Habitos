import type { DayStatus, MonthStats, Routine, RoutineLog } from '../types';
import { addDays, dateToKey, getDaysInMonth } from './date';

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
  const activeRoutines = routines.filter((routine) => routine.is_active === 1);
  const daysInMonth = getDaysInMonth(referenceDate);
  const completedLogs = logs.filter((log) => log.completed === 1);

  const routineProgress = activeRoutines.map((routine) => {
    const completed = completedLogs.filter((log) => log.routine_id === routine.id).length;
    const goalPercent = routine.monthly_goal_percent ?? 80;
    const goal = Math.ceil(daysInMonth * (goalPercent / 100));
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

  const completeDays = Object.values(completedByDate).filter(
    (completedCount) => activeRoutines.length > 0 && completedCount >= activeRoutines.length,
  ).length;

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
  const activeRoutines = routines.filter((routine) => routine.is_active === 1);

  if (activeRoutines.length === 0) {
    return 0;
  }

  const activeIds = new Set(activeRoutines.map((routine) => routine.id));
  const completedByDate = logs.reduce<Record<string, Set<string>>>((acc, log) => {
    if (log.completed !== 1 || !activeIds.has(log.routine_id)) {
      return acc;
    }

    acc[log.date] = acc[log.date] ?? new Set<string>();
    acc[log.date].add(log.routine_id);

    return acc;
  }, {});
  let streak = 0;
  let cursor = referenceDate;

  while ((completedByDate[dateToKey(cursor)]?.size ?? 0) >= activeRoutines.length) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}
