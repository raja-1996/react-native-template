import { useState, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';
import { Button } from '../../components/button';
import { useTheme } from '../../hooks/use-theme';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface LogEntry {
  id: number;
  message: string;
  timestamp: string;
}

export default function RealtimeScreen() {
  const colors = useTheme();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [counter, setCounter] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const logIdRef = useRef(0);

  const addLog = (message: string) => {
    logIdRef.current += 1;
    setLogs((prev) => [
      { id: logIdRef.current, message, timestamp: new Date().toLocaleTimeString() },
      ...prev.slice(0, 49),
    ]);
  };

  const subscribe = () => {
    if (channelRef.current) return;

    const channel = supabase.channel('realtime-playground', {
      config: { presence: { key: `user-${Date.now()}` } },
    });

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'todos' },
      (payload) => {
        const eventType = payload.eventType;
        const title =
          (payload.new as any)?.title || (payload.old as any)?.id?.slice(0, 8) || 'unknown';
        addLog(`${eventType}: ${title}`);
      }
    );

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      setOnlineCount(Object.keys(state).length);
    });

    channel.on('broadcast', { event: 'counter' }, ({ payload }) => {
      setCounter(payload.value);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsSubscribed(true);
        addLog('Connected to realtime channel');
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

    channelRef.current = channel;
  };

  const unsubscribe = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsSubscribed(false);
      setOnlineCount(0);
      addLog('Disconnected from realtime channel');
    }
  };

  const incrementCounter = () => {
    const newValue = counter + 1;
    setCounter(newValue);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'counter',
      payload: { value: newValue },
    });
  };

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Connection */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <ThemedText style={styles.cardTitle}>Connection</ThemedText>
          <ThemedText variant="secondary" style={styles.cardDescription}>
            Subscribe to realtime events from the todos table
          </ThemedText>
          <Button
            title={isSubscribed ? 'Disconnect' : 'Connect'}
            variant={isSubscribed ? 'danger' : 'primary'}
            onPress={isSubscribed ? unsubscribe : subscribe}
          />
        </View>

        {/* Presence */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <ThemedText style={styles.cardTitle}>Presence</ThemedText>
          <ThemedText variant="secondary" style={styles.cardDescription}>
            Users currently connected to this channel
          </ThemedText>
          <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
            <ThemedText style={styles.countText}>{onlineCount}</ThemedText>
          </View>
        </View>

        {/* Broadcast Counter */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <ThemedText style={styles.cardTitle}>Broadcast Counter</ThemedText>
          <ThemedText variant="secondary" style={styles.cardDescription}>
            Shared counter synced across all connected clients
          </ThemedText>
          <View style={styles.counterRow}>
            <ThemedText style={styles.counterValue}>{counter}</ThemedText>
            <Button
              title="Increment"
              onPress={incrementCounter}
              disabled={!isSubscribed}
            />
          </View>
        </View>

        {/* Live Log */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <ThemedText style={styles.cardTitle}>Live Event Log</ThemedText>
          <ThemedText variant="secondary" style={styles.cardDescription}>
            Real-time database changes on the todos table
          </ThemedText>
          <View style={[styles.logContainer, { backgroundColor: colors.background }]}>
            {logs.length === 0 ? (
              <ThemedText variant="secondary" style={styles.logEmpty}>
                No events yet. Connect and modify todos to see live updates.
              </ThemedText>
            ) : (
              logs.map((entry) => (
                <View key={entry.id} style={styles.logEntry}>
                  <ThemedText variant="secondary" style={styles.logTimestamp}>
                    {entry.timestamp}
                  </ThemedText>
                  <ThemedText style={styles.logMessage}>{entry.message}</ThemedText>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md },
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  cardDescription: {
    fontSize: FontSize.md,
    marginBottom: Spacing.md,
  },
  countBadge: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: FontSize.xl,
    fontWeight: 'bold',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  counterValue: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
  },
  logContainer: {
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    maxHeight: 300,
  },
  logEmpty: {
    textAlign: 'center',
    padding: Spacing.md,
  },
  logEntry: {
    flexDirection: 'row',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  logTimestamp: {
    fontSize: FontSize.sm,
  },
  logMessage: {
    fontSize: FontSize.sm,
    flex: 1,
  },
});
