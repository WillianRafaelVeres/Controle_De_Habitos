export type Frequency = 'daily';

export type Routine = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  color: string | null;
  frequency: Frequency;
  monthly_goal: number | null;
  monthly_goal_percent: number | null;
  is_active: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RoutineLog = {
  id: string;
  routine_id: string;
  routine_name_snapshot: string;
  date: string;
  completed: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RoutineFormValues = {
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  color?: string;
  monthly_goal?: number | null;
  monthly_goal_percent?: number | null;
};

export type DayStatus = 'complete' | 'partial' | 'empty';

export type RoutineProgress = {
  routine: Routine;
  completed: number;
  goal: number;
  goalPercent: number;
  percentage: number;
};

export type DailyProgressPoint = {
  date: string;
  day: number;
  percentage: number;
  completed: number;
  total: number;
};

export type MonthlyProgressPoint = {
  month: number;
  label: string;
  percentage: number;
};

export type MonthStats = {
  overallProgress: number;
  totalCompleted: number;
  totalGoal: number;
  averageProgress: number;
  completeDays: number;
  routineProgress: RoutineProgress[];
  bestRoutine: RoutineProgress | null;
  worstRoutine: RoutineProgress | null;
};

export type RootTabParamList = {
  Dashboard: undefined;
  Routines: undefined;
  Calendar: undefined;
  Stats: undefined;
};
