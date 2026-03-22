import { Pressable, PressableProps, StyleSheet, ActivityIndicator } from 'react-native';
import { ThemedText } from './themed-text';
import { useTheme } from '../hooks/use-theme';
import { BorderRadius, Spacing, FontSize } from '../constants/theme';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: 'primary' | 'danger' | 'outline';
  loading?: boolean;
}

export function Button({ title, variant = 'primary', loading, style, ...rest }: ButtonProps) {
  const colors = useTheme();

  const bgColor = variant === 'primary'
    ? colors.primary
    : variant === 'danger'
    ? colors.danger
    : 'transparent';

  const textColor = variant === 'outline' ? colors.primary : colors.primaryText;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bgColor, opacity: pressed ? 0.8 : 1 },
        variant === 'outline' && { borderWidth: 1.5, borderColor: colors.primary },
        rest.disabled && styles.disabled,
        style as any,
      ]}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <ThemedText style={[styles.text, { color: textColor }]}>{title}</ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  text: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
