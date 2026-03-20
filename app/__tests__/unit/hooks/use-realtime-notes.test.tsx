import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react-native";
import React from "react";

import { useRealtimeNotes } from "@/hooks/use-realtime-notes";
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

describe("useRealtimeNotes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should subscribe to notes-changes channel on mount", () => {
    renderHook(() => useRealtimeNotes(), { wrapper: createWrapper() });

    expect(supabase.channel).toHaveBeenCalledWith("notes-changes");
    expect(mockedSupabase.__mockChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "notes" },
      expect.any(Function)
    );
    expect(mockedSupabase.__mockChannel.subscribe).toHaveBeenCalled();
  });

  it("should unsubscribe on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeNotes(), {
      wrapper: createWrapper(),
    });

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});
