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

export type ActivityType = 'study' | 'habit' | 'task' | 'prayer' | 'exercise' | 'work' | 'other';

export type Activity = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  category: string | null;
  icon: string | null;
  color: string | null;
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  type: ActivityType;
  is_active: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WeeklySchedule = {
  id: string;
  activity_id: string;
  weekday: number;
  has_fixed_time: number;
  start_time: string | null;
  end_time: string | null;
  reminder_time: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type ActivityWithSchedules = Activity & {
  schedules: WeeklySchedule[];
};

export type ActivityFormValues = {
  name: string;
  description?: string;
  category_id?: string | null;
  category?: string | null;
  icon?: string | null;
  color?: string | null;
  type: ActivityType;
  weekdays: number[];
  has_fixed_time: boolean;
  start_time?: string | null;
  end_time?: string | null;
  reminder_time?: string | null;
  is_active?: boolean;
};

export type DailyLog = {
  id: string;
  activity_id: string;
  schedule_id: string | null;
  date: string;
  completed: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PlannedActivityItem = {
  activity: Activity;
  schedule: WeeklySchedule;
  log: DailyLog | null;
  date: string;
  status: 'planned' | 'done' | 'not_done' | 'pending';
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  active_activity_count?: number;
  total_activity_count?: number;
};

export type CategoryFormValues = {
  name: string;
  description?: string;
  icon?: string | null;
  color?: string | null;
  sort_order?: number;
};

export type StudySession = {
  id: string;
  activity_id: string | null;
  activity_name_snapshot: string;
  category_id?: string | null;
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  started_at: string;
  ended_at: string | null;
  planned_focus_minutes: number;
  planned_break_minutes: number;
  actual_study_seconds: number;
  focus_breaks_count: number;
  completed: number;
  created_at: string;
  updated_at: string;
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
  Qts: undefined;
  Calendar: undefined;
  Routines: undefined;
  Study: undefined;
  Stats: undefined;
};
