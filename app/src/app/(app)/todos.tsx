import { useState } from 'react';
import { FlatList, StyleSheet, Pressable, View, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { TodoCard } from '../../components/todo-card';
import { useTodos, useUpdateTodo, useDeleteTodo } from '../../hooks/use-todos';
import { useTheme } from '../../hooks/use-theme';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';

export default function TodosScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { data: todos, isLoading, refetch } = useTodos();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleToggle = (id: string, isCompleted: boolean) => {
    updateTodo.mutate({ id, data: { is_completed: !isCompleted } });
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Todo', 'Are you sure you want to delete this todo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTodo.mutate(id) },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={todos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TodoCard
            title={item.title}
            description={item.description}
            isCompleted={item.is_completed}
            onPress={() => router.push({ pathname: '/(app)/todo-detail', params: { id: item.id } })}
            onToggle={() => handleToggle(item.id, item.is_completed)}
            onLongPress={() => handleDelete(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
                <ThemedText style={styles.emptyIcon}>☑</ThemedText>
              </View>
              <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>No todos yet</ThemedText>
              <ThemedText style={[styles.emptyCaption, { color: colors.textSecondary }]}>Tap + to create your first one</ThemedText>
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <Pressable
        testID="fab-button"
        onPress={() => router.push({ pathname: '/(app)/todo-detail' })}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <ThemedText style={[styles.fabText, { color: colors.primaryText }]}>+</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: {
    padding: Spacing.md,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xxl * 2,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyIcon: {
    fontSize: FontSize.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyCaption: {
    fontSize: FontSize.md,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
  },
  fabText: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 30,
  },
});
