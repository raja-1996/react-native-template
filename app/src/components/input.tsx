import { TextInput, TextInputProps, View, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { useTheme } from '../hooks/use-theme';
import { BorderRadius, Spacing, FontSize } from '../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...rest }: InputProps) {
  const colors = useTheme();

  return (
    <View style={styles.container}>
      {label && <ThemedText style={styles.label}>{label}</ThemedText>}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            borderColor: error ? colors.danger : colors.border,
            color: colors.text,
          },
          style,
        ]}
        placeholderTextColor={colors.textSecondary}
        {...rest}
      />
      {error && (
        <ThemedText style={[styles.error, { color: colors.danger }]}>{error}</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: FontSize.lg,
    minHeight: 52,
  },
  error: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
});
