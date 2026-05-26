import { useEffect, useRef } from 'react';
import { Check, Circle } from 'lucide-react-native';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Routine } from '../types';
import { colors, radii, spacing, typography } from '../theme';
import { getRoutineColor, getRoutineIcon } from '../utils/routineVisuals';

type RoutineCheckRowProps = {
  routine: Routine;
  checked: boolean;
  onToggle: () => void;
};

export function RoutineCheckRow({ routine, checked, onToggle }: RoutineCheckRowProps) {
  const accent = getRoutineColor(routine.color);
  const Icon = getRoutineIcon(routine.icon);
  const checkScale = useRef(new Animated.Value(checked ? 1 : 0.92)).current;

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: checked ? 1.08 : 0.92,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start(() => {
      if (checked) {
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 6,
          tension: 90,
          useNativeDriver: true,
        }).start();
      }
    });
  }, [checkScale, checked]);

  return (
    <Pressable onPress={onToggle} style={({ pressed }) => [styles.container, checked && styles.containerChecked, pressed && styles.pressed]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
        <Icon size={20} color={accent} strokeWidth={2.4} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.name, !routine.is_active && styles.inactive]} numberOfLines={1}>
          {routine.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {routine.category || 'Rotina diaria'}
        </Text>
      </View>
      <Animated.View style={[styles.check, checked && { backgroundColor: accent, borderColor: accent }, { transform: [{ scale: checkScale }] }]}>
        {checked ? <Check size={18} color={colors.white} strokeWidth={3} /> : <Circle size={20} color={colors.textSubtle} />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'rgba(24, 24, 27, 0.76)',
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 62,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.82,
  },
  containerChecked: {
    borderColor: 'rgba(20, 184, 166, 0.34)',
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },
  inactive: {
    color: colors.textSubtle,
  },
  meta: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: spacing.xs,
  },
  check: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
