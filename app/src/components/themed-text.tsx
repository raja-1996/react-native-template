import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/use-theme';

interface ThemedTextProps extends TextProps {
  variant?: 'default' | 'secondary' | 'title';
}

export function ThemedText({ style, variant = 'default', ...rest }: ThemedTextProps) {
  const colors = useTheme();

  return (
    <Text
      style={[
        styles.base,
        variant === 'secondary' && { color: colors.textSecondary },
        variant === 'title' && styles.title,
        { color: variant === 'secondary' ? colors.textSecondary : colors.text },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
});
