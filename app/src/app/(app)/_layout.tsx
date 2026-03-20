import { Tabs } from 'expo-router';
import { useTheme } from '../../hooks/use-theme';

export default function AppLayout() {
  const colors = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
      }}
    >
      <Tabs.Screen
        name="todos"
        options={{
          title: 'Todos',
          tabBarLabel: 'Todos',
        }}
      />
      <Tabs.Screen
        name="realtime"
        options={{
          title: 'Realtime',
          tabBarLabel: 'Realtime',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
        }}
      />
      <Tabs.Screen
        name="todo-detail"
        options={{
          href: null,
          title: 'Todo',
        }}
      />
    </Tabs>
  );
}
