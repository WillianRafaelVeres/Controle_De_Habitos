import type { DailyProgressPoint, MonthlyProgressPoint, Routine, RoutineLog } from '../types';

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function dateToKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function todayKey() {
  return dateToKey(new Date());
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getMonthEnd(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getMonthRange(date = new Date()) {
  return {
    start: dateToKey(getMonthStart(date)),
    end: dateToKey(getMonthEnd(date)),
  };
}

export function getYearRange(year: number) {
  return {
    start: dateToKey(new Date(year, 0, 1)),
    end: dateToKey(new Date(year, 11, 31)),
  };
}

export function getDaysElapsedInMonth(date = new Date()) {
  return date.getDate();
}

export function getDaysInMonth(date = new Date()) {
  return getMonthEnd(date).getDate();
}

export function getDaysOfMonth(date = new Date()) {
  return Array.from({ length: getDaysInMonth(date) }, (_, index) => {
    const dayDate = new Date(date.getFullYear(), date.getMonth(), index + 1);

    return {
      date: dayDate,
      key: dateToKey(dayDate),
      day: index + 1,
    };
  });
}

export function getLastNDays(amount: number, reference = new Date()) {
  return Array.from({ length: amount }, (_, index) => {
    const date = addDays(reference, index - amount + 1);

    return {
      date,
      key: dateToKey(date),
      label: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
        .format(date)
        .replace('.', '')
        .slice(0, 3),
    };
  });
}

export function getCalendarGrid(date = new Date()) {
  const firstDay = getMonthStart(date);
  const totalDays = getDaysInMonth(date);
  const leadingBlanks = firstDay.getDay();
  const today = todayKey();
  const cells: Array<{ key: string; day: number; isToday: boolean } | null> = [];

  for (let index = 0; index < leadingBlanks; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const cellDate = new Date(date.getFullYear(), date.getMonth(), day);
    const key = dateToKey(cellDate);
    cells.push({ key, day, isToday: key === today });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function previousMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

export function nextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export function previousYear(year: number) {
  return year - 1;
}

export function nextYear(year: number) {
  return year + 1;
}

export function getWeekdayLabels() {
  return WEEKDAY_LABELS;
}

export function getMonthLabels() {
  return MONTH_LABELS;
}

export function formatMonthTitle(date = new Date()) {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatReadableDate(dateKey: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(parseDateKey(dateKey));
}

export function formatMonthYear(dateKey: string) {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(parseDateKey(`${dateKey}-01`));

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function getDateKeyFromIso(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return dateToKey(new Date(value));
}

export function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Bom dia';
  }

  if (hour < 18) {
    return 'Boa tarde';
  }

  return 'Boa noite';
}

export function wasRoutineAvailableOnDate(routine: Routine, dateKey: string) {
  const createdKey = getDateKeyFromIso(routine.created_at);
  const archivedKey = getDateKeyFromIso(routine.archived_at);

  if (createdKey && createdKey > dateKey) {
    return false;
  }

  return !archivedKey || archivedKey > dateKey;
}

export function getRoutinesForDate(dateKey: string, routines: Routine[], logs: RoutineLog[] = []) {
  const loggedRoutineIds = new Set(logs.filter((log) => log.date === dateKey).map((log) => log.routine_id));

  return routines.filter((routine) => wasRoutineAvailableOnDate(routine, dateKey) || loggedRoutineIds.has(routine.id));
}

export function countExpectedRoutinesForDate(dateKey: string, routines: Routine[]) {
  return routines.filter((routine) => wasRoutineAvailableOnDate(routine, dateKey)).length;
}

export function calculateDailyPercentage(dateKey: string, routines: Routine[], logs: RoutineLog[]) {
  const routinesForDate = getRoutinesForDate(dateKey, routines, logs);

  if (routinesForDate.length === 0) {
    return { percentage: 0, completed: 0, total: 0 };
  }

  const routineIds = new Set(routinesForDate.map((routine) => routine.id));
  const completed = new Set(
    logs
      .filter((log) => log.date === dateKey && log.completed === 1 && routineIds.has(log.routine_id))
      .map((log) => log.routine_id),
  ).size;
  const total = Math.max(routinesForDate.length, completed);

  return {
    percentage: total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0,
    completed,
    total,
  };
}

export function buildDailyProgressForMonth(date: Date, routines: Routine[], logs: RoutineLog[]): DailyProgressPoint[] {
  return getDaysOfMonth(date).map((day) => {
    const progress = calculateDailyPercentage(day.key, routines, logs);

    return {
      date: day.key,
      day: day.day,
      ...progress,
    };
  });
}

export function calculateMonthlyAverage(date: Date, routines: Routine[], logs: RoutineLog[]) {
  const points = buildDailyProgressForMonth(date, routines, logs);
  const daysWithExpectedRoutines = points.filter((point) => point.total > 0);

  if (daysWithExpectedRoutines.length === 0) {
    return 0;
  }

  return Math.round(daysWithExpectedRoutines.reduce((sum, point) => sum + point.percentage, 0) / daysWithExpectedRoutines.length);
}

export function buildMonthlyProgressForYear(year: number, routines: Routine[], logs: RoutineLog[]): MonthlyProgressPoint[] {
  return MONTH_LABELS.map((label, index) => {
    const monthDate = new Date(year, index, 1);
    const range = getMonthRange(monthDate);
    const monthLogs = logs.filter((log) => log.date >= range.start && log.date <= range.end);

    return {
      month: index + 1,
      label,
      percentage: calculateMonthlyAverage(monthDate, routines, monthLogs),
    };
  });
}

export function calculateAnnualAverage(year: number, routines: Routine[], logs: RoutineLog[]) {
  const points = buildMonthlyProgressForYear(year, routines, logs);
  const monthsWithExpectedRoutines = points.filter((point) => point.percentage > 0);

  if (monthsWithExpectedRoutines.length === 0) {
    return 0;
  }

  return Math.round(monthsWithExpectedRoutines.reduce((sum, point) => sum + point.percentage, 0) / monthsWithExpectedRoutines.length);
}
