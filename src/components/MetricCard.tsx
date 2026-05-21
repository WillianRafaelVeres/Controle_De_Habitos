import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideProps } from 'lucide-react-native';
import { Card } from './Card';
import { colors, radii, spacing, typography } from '../theme';

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  icon: ComponentType<LucideProps>;
  accent?: string;
};

export function MetricCard({ label, value, detail, icon: Icon, accent = colors.primary }: MetricCardProps) {
  return (
    <Card style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}24` }]}>
        <Icon size={19} color={accent} strokeWidth={2.4} />
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 142,
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  value: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '800',
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: spacing.xs,
  },
  detail: {
    color: colors.textSubtle,
    fontSize: typography.tiny,
    marginTop: spacing.xs,
  },
});
