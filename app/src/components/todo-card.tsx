import { Pressable, View, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { useTheme } from '../hooks/use-theme';
import { BorderRadius, Spacing, FontSize } from '../constants/theme';

interface TodoCardProps {
  title: string;
  description?: string;
  isCompleted: boolean;
  onPress: () => void;
  onToggle: () => void;
  onLongPress?: () => void;
}

export function TodoCard({ title, description, isCompleted, onPress, onToggle, onLongPress }: TodoCardProps) {
  const colors = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Pressable onPress={onToggle} style={styles.checkbox}>
        <View
          style={[
            styles.checkboxInner,
            {
              borderColor: isCompleted ? colors.success : colors.border,
              backgroundColor: isCompleted ? colors.success : 'transparent',
            },
          ]}
        >
          {isCompleted && <ThemedText style={styles.checkmark}>✓</ThemedText>}
        </View>
      </Pressable>
      <View style={styles.content}>
        <ThemedText
          style={[
            styles.title,
            isCompleted && { textDecorationLine: 'line-through', opacity: 0.6 },
          ]}
        >
          {title}
        </ThemedText>
        {description ? (
          <ThemedText variant="secondary" numberOfLines={2} style={styles.description}>
            {description}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  checkbox: {
    marginRight: Spacing.md,
    padding: Spacing.xs,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '500',
  },
  description: {
    fontSize: FontSize.md,
    marginTop: Spacing.xs,
  },
});
