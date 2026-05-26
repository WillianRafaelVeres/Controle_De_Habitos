import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing } from '../theme';

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    ...shadows.card,
  },
});
