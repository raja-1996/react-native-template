import { useState, useEffect, useRef } from 'react';
import { StyleSheet, ScrollView, View, FlatList } from 'react-native';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { Button } from '../../components/button';
import { useAuthStore } from '../../stores/auth-store';
import { useTheme } from '../../hooks/use-theme';
import { supabase } from '../../lib/supabase';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';

interface LogEntry {
  id: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  title: string;
  timestamp: string;
}

const CHANNEL_NAME = 'realtime-playground';
const LOG_CAP = 50;

export default function RealtimeScreen() {
  const colors = useTheme();
  const user = useAuthStore((s) => s.user);

  const [log, setLog] = useState<LogEntry[]>([]);
  const [presenceCount, setPresenceCount] = useState(0);
  const [counter, setCounter] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (channelRef.current) {
      return;
    }

    const channel = supabase.channel(CHANNEL_NAME, {
      config: { broadcast: { self: true } },
    });

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'todos' },
      (payload) => {
        const record = (payload.new && Object.keys(payload.new).length > 0
          ? payload.new
          : payload.old) as Record<string, unknown>;

        const entry: LogEntry = {
          id: `${Date.now()}-${Math.random()}`,
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          title: record?.title != null ? String(record.title) : '(untitled)',
          timestamp: new Date().toLocaleTimeString(),
        };

        setLog((prev) => [entry, ...prev].slice(0, LOG_CAP));
      }
    );

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setPresenceCount(Object.keys(state).length);
    });

    channel.on('broadcast', { event: 'counter' }, (payload) => {
      if (typeof payload.payload?.value === 'number') {
        setCounter(payload.payload.value);
      }
    });

    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) supabase.realtime.setAuth(accessToken);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        channel.track({ user_id: user?.id ?? 'anonymous' });
      } else if (
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT' ||
        status === 'CLOSED'
      ) {
        supabase.removeChannel(channelRef.current!);
        channelRef.current = null;
        setIsConnected(false);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [user]);

  const handleToggleConnection = () => {
    if (isConnected) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    } else {
      if (channelRef.current) {
        return;
      }

      const channel = supabase.channel(CHANNEL_NAME, {
        config: { broadcast: { self: true } },
      });

      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos' },
        (payload) => {
          const record = (payload.new && Object.keys(payload.new).length > 0
            ? payload.new
            : payload.old) as Record<string, unknown>;

          const entry: LogEntry = {
            id: `${Date.now()}-${Math.random()}`,
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            title: record?.title != null ? String(record.title) : '(untitled)',
            timestamp: new Date().toLocaleTimeString(),
          };

          setLog((prev) => [entry, ...prev].slice(0, LOG_CAP));
        }
      );

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setPresenceCount(Object.keys(state).length);
      });

      channel.on('broadcast', { event: 'counter' }, (payload) => {
        if (typeof payload.payload?.value === 'number') {
          setCounter(payload.payload.value);
        }
      });

      const accessToken = useAuthStore.getState().accessToken;
      if (accessToken) supabase.realtime.setAuth(accessToken);

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          channel.track({ user_id: user?.id ?? 'anonymous' });
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          supabase.removeChannel(channelRef.current!);
          channelRef.current = null;
          setIsConnected(false);
        }
      });

      channelRef.current = channel;
    }
  };

  const handleIncrement = () => {
    const nextValue = counter + 1;
    channelRef.current?.send({
      type: 'broadcast',
      event: 'counter',
      payload: { value: nextValue },
    });
  };

  const getBadgeColor = (eventType: LogEntry['eventType']) => {
    if (eventType === 'INSERT') return colors.success;
    if (eventType === 'UPDATE') return colors.primary;
    return colors.danger;
  };

  const renderLogEntry = ({ item }: { item: LogEntry }) => (
    <View style={styles.logEntry}>
      <View style={[styles.badge, { backgroundColor: getBadgeColor(item.eventType) }]}>
        <ThemedText style={styles.badgeText}>{item.eventType}</ThemedText>
      </View>
      <ThemedText style={styles.logTitle} numberOfLines={1}>{item.title}</ThemedText>
      <ThemedText variant="secondary" style={styles.logTimestamp}>{item.timestamp}</ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Connection toggle */}
        <View style={styles.connectionRow}>
          <Button
            title={isConnected ? 'Disconnect' : 'Reconnect'}
            variant={isConnected ? 'danger' : 'primary'}
            onPress={handleToggleConnection}
            testID="disconnect-button"
          />
        </View>

        {/* Card 1: Live Todos Feed */}
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <ThemedText style={styles.cardTitle}>Live Todos Feed</ThemedText>
          <View style={styles.logContainer}>
            <FlatList
              data={log}
              keyExtractor={(item) => item.id}
              renderItem={renderLogEntry}
              testID="log-list"
              scrollEnabled={false}
              ListEmptyComponent={
                <ThemedText variant="secondary" style={styles.emptyText}>
                  Waiting for todo changes…
                </ThemedText>
              }
            />
          </View>
        </View>

        {/* Card 2: Presence */}
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <ThemedText style={styles.cardTitle}>Presence</ThemedText>
          <ThemedText
            testID="presence-count"
            style={styles.presenceText}
          >
            {presenceCount} user(s) on this screen
          </ThemedText>
        </View>

        {/* Card 3: Broadcast Counter */}
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <ThemedText style={styles.cardTitle}>Broadcast Counter</ThemedText>
          <ThemedText testID="counter-value" style={styles.counterValue}>
            {counter}
          </ThemedText>
          <Button
            title="Increment"
            variant="primary"
            onPress={handleIncrement}
            testID="increment-button"
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md },
  connectionRow: {
    marginBottom: Spacing.md,
  },
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  logContainer: {
    height: 200,
    overflow: 'hidden',
  },
  logEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: FontSize.sm,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  logTitle: {
    flex: 1,
    fontSize: FontSize.md,
  },
  logTimestamp: {
    fontSize: FontSize.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  presenceText: {
    fontSize: FontSize.lg,
  },
  counterValue: {
    fontSize: FontSize.title,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
