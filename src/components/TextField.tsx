import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

type TextFieldProps = TextInputProps & {
  label: string;
};

export function TextField({ label, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSubtle}
        selectionColor={colors.secondary}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  input: {
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(8, 13, 31, 0.86)',
    color: colors.text,
    fontSize: typography.body,
    paddingHorizontal: spacing.lg,
  },
});
