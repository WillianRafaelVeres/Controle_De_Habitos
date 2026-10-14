import type { ComponentType } from 'react';
import {
  Activity as ActivityIcon,
  BookOpen,
  Brain,
  Coffee,
  Dumbbell,
  Droplets,
  HeartPulse,
  Moon,
  Sparkles,
  Target,
} from 'lucide-react-native';
import type { Activity, Category } from '../types';

export type RoutineIconOption = {
  key: string;
  label: string;
  Icon: ComponentType<any>;
};

export const ROUTINE_ICONS: RoutineIconOption[] = [
  { key: 'target', label: 'Meta', Icon: Target },
  { key: 'activity', label: 'Atividade', Icon: ActivityIcon },
  { key: 'dumbbell', label: 'Treino', Icon: Dumbbell },
  { key: 'book', label: 'Leitura', Icon: BookOpen },
  { key: 'brain', label: 'Foco', Icon: Brain },
  { key: 'droplets', label: 'Agua', Icon: Droplets },
  { key: 'heart', label: 'Saude', Icon: HeartPulse },
  { key: 'moon', label: 'Sono', Icon: Moon },
  { key: 'coffee', label: 'Cafe', Icon: Coffee },
  { key: 'sparkles', label: 'Geral', Icon: Sparkles },
];

export const ROUTINE_COLORS = [
  '#7C5CFF',
  '#26D9FF',
  '#31D08A',
  '#F5B84B',
  '#D946EF',
  '#FF5D73',
  '#38BDF8',
  '#A3E635',
];

export function getRoutineIcon(iconKey?: string | null) {
  return ROUTINE_ICONS.find((item) => item.key === iconKey)?.Icon ?? Target;
}

export function getRoutineColor(color?: string | null) {
  return color ?? ROUTINE_COLORS[0];
}

export function getActivityColor(activity: Pick<Activity, 'color' | 'category_color'>) {
  return activity.color || activity.category_color || ROUTINE_COLORS[0];
}

export function getActivityIcon(activity: Pick<Activity, 'icon' | 'category_icon'>) {
  return getRoutineIcon(activity.icon || activity.category_icon);
}

export function getCategoryColor(category?: Pick<Category, 'color'> | null) {
  return category?.color || ROUTINE_COLORS[0];
}

export function getCategoryIcon(category?: Pick<Category, 'icon'> | null) {
  return getRoutineIcon(category?.icon);
}
