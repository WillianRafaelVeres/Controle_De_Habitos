import type { ComponentType, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { LucideProps } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, spacing, typography } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type PrimaryButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  icon?: ComponentType<LucideProps>;
  variant?: ButtonVariant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  icon: Icon,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...props
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.text} />
      ) : Icon ? (
        <Icon size={18} color={variant === 'primary' ? colors.white : colors.text} strokeWidth={2.4} />
      ) : null}
      <Text style={[styles.label, variant !== 'primary' && styles.labelSecondary]} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  return (
    <Pressable disabled={isDisabled} style={({ pressed }) => [pressed && styles.pressed, isDisabled && styles.disabled, style]} {...props}>
      {variant === 'primary' ? (
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.base}>
          {content}
        </LinearGradient>
      ) : (
        <TextButtonShell variant={variant}>{content}</TextButtonShell>
      )}
    </Pressable>
  );
}

function TextButtonShell({ children, variant }: { children: ReactNode; variant: ButtonVariant }) {
  return <View style={[styles.base, styles.secondary, variant === 'danger' && styles.danger, variant === 'ghost' && styles.ghost]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  secondary: {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
    borderWidth: 1,
  },
  danger: {
    backgroundColor: 'rgba(255, 93, 115, 0.13)',
    borderColor: 'rgba(255, 93, 115, 0.36)',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
    borderWidth: 1,
  },
  label: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '800',
  },
  labelSecondary: {
    color: colors.text,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.55,
  },
});
