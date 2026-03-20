import { useState } from 'react';
import { FlatList, StyleSheet, Pressable, View, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { TodoCard } from '../../components/todo-card';
import { useTodos, useUpdateTodo, useDeleteTodo } from '../../hooks/use-todos';
import { useTheme } from '../../hooks/use-theme';
import { Spacing, BorderRadius } from '../../constants/theme';

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
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <ThemedText variant="secondary">No todos yet. Tap + to create one.</ThemedText>
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <Pressable
        onPress={() => router.push({ pathname: '/(app)/todo-detail' })}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <ThemedText style={styles.fabText}>+</ThemedText>
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
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 30,
  },
});
