import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideProps } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../theme';

type EmptyStateProps = {
  title: string;
  subtitle: string;
  icon: ComponentType<LucideProps>;
};

export function EmptyState({ title, subtitle, icon: Icon }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon size={26} color={colors.secondary} strokeWidth={2.3} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  iconWrap: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: 'rgba(38, 217, 255, 0.12)',
  },
  title: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: 19,
    textAlign: 'center',
  },
});
