import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { supabase } from "@/lib/supabase";

/**
 * Subscribe to realtime message changes in a room.
 * Invalidates the messages query whenever a change occurs.
 */
export function useRealtimeMessages(roomId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`messages-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", roomId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, roomId]);
}

/**
 * Track online presence in a room.
 * Returns a list of currently online user IDs.
 */
export function usePresence(roomId: string, userId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!roomId || !userId) return;

    const channel = supabase.channel(`presence-${roomId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const onlineIds = Object.keys(state);
        queryClient.setQueryData(["presence", roomId], onlineIds);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, roomId, userId]);
}

/**
 * Typing indicator for a room.
 * Returns { isTyping, setTyping, typingUsers } where typingUsers is a list of user IDs currently typing.
 */
export function useTypingIndicator(roomId: string, userId: string) {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const channelRef = useRef<ReturnType<typeof supabase.channel>>();

  useEffect(() => {
    if (!roomId || !userId) return;

    const channel = supabase.channel(`typing-${roomId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.user_id === userId) return;
        queryClient.setQueryData<string[]>(
          ["typing", roomId],
          (prev = []) => {
            if (!prev.includes(payload.user_id)) {
              return [...prev, payload.user_id];
            }
            return prev;
          }
        );
        // Auto-remove after 3 seconds
        setTimeout(() => {
          queryClient.setQueryData<string[]>(
            ["typing", roomId],
            (prev = []) => prev.filter((id) => id !== payload.user_id)
          );
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, roomId, userId]);

  const setTyping = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId },
    });
    timeoutRef.current = setTimeout(() => {
      // Typing stops after inactivity
    }, 2000);
  }, [userId]);

  return { setTyping };
}
