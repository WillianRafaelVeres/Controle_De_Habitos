import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: spacing.xs,
  },
});
