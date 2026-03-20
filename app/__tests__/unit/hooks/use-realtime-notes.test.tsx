import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react-native";
import React from "react";

import { useRealtimeMessages } from "@/hooks/use-realtime-notes";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => {
  const mockChannel = {
    on: jest.fn(function () {
      return this;
    }),
    subscribe: jest.fn(function () {
      return this;
    }),
  };
  return {
    supabase: {
      channel: jest.fn(() => mockChannel),
      removeChannel: jest.fn(),
      __mockChannel: mockChannel,
    },
  };
});

const mockedSupabase = supabase as jest.Mocked<typeof supabase> & {
  __mockChannel: { on: jest.Mock; subscribe: jest.Mock };
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useRealtimeMessages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should subscribe to messages channel on mount", () => {
    renderHook(() => useRealtimeMessages("room-1"), { wrapper: createWrapper() });

    expect(supabase.channel).toHaveBeenCalledWith("messages-room-1");
    expect(mockedSupabase.__mockChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages", filter: "room_id=eq.room-1" },
      expect.any(Function)
    );
    expect(mockedSupabase.__mockChannel.subscribe).toHaveBeenCalled();
  });

  it("should unsubscribe on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeMessages("room-1"), {
      wrapper: createWrapper(),
    });

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalled();
  });

  it("should not subscribe when roomId is empty", () => {
    renderHook(() => useRealtimeMessages(""), { wrapper: createWrapper() });

    expect(supabase.channel).not.toHaveBeenCalled();
  });
});
