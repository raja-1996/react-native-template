import { useEffect, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useTheme } from '../../hooks/use-theme';
import {
  registerForPushNotifications,
  addNotificationListener,
  addNotificationResponseListener,
} from '../../lib/notifications';

export default function AppLayout() {
  const colors = useTheme();
  const router = useRouter();
  const notificationListener = useRef<{ remove: () => void } | null>(null);
  const responseListener = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    registerForPushNotifications().catch(() => {
      // permission denied or simulator — silently ignore
    });

    notificationListener.current = addNotificationListener((_notification) => {
      // no-op: notification received in foreground
    });

    responseListener.current = addNotificationResponseListener((response) => {
      const todoId = response.notification.request.content.data?.todoId;
      if (todoId) {
        router.push({ pathname: '/(app)/todo-detail', params: { id: todoId } });
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        }}
      />
      <Tabs.Screen
        name="realtime"
        options={{
          title: 'Realtime',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
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
