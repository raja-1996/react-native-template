import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import {
  useCreateRoom,
  useDeleteRoom,
  useRooms,
  useCreateMessage,
  useDeleteMessage,
} from "@/hooks/use-notes";
import { roomsApi, messagesApi } from "@/services/notes";

jest.mock("@/services/notes", () => ({
  roomsApi: {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  messagesApi: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedRoomsApi = roomsApi as jest.Mocked<typeof roomsApi>;
const mockedMessagesApi = messagesApi as jest.Mocked<typeof messagesApi>;

const mockRoom = {
  id: "room-1",
  name: "General",
  created_by: "user-1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockMessage = {
  id: "msg-1",
  room_id: "room-1",
  user_id: "user-1",
  content: "Hello",
  image_path: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useRooms", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch rooms list", async () => {
    mockedRoomsApi.list.mockResolvedValueOnce([mockRoom]);

    const { result } = renderHook(() => useRooms(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([mockRoom]);
    expect(mockedRoomsApi.list).toHaveBeenCalledTimes(1);
  });

  it("should handle empty rooms list", async () => {
    mockedRoomsApi.list.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useRooms(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("should handle fetch error", async () => {
    mockedRoomsApi.list.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useRooms(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Network error");
  });
});

describe("useCreateRoom", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a room and invalidate queries", async () => {
    const newRoom = { ...mockRoom, id: "room-2", name: "New Room" };
    mockedRoomsApi.create.mockResolvedValueOnce(newRoom);

    const { result } = renderHook(() => useCreateRoom(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: "New Room" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedRoomsApi.create).toHaveBeenCalledWith(
      { name: "New Room" },
      expect.anything()
    );
  });
});

describe("useDeleteRoom", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete a room", async () => {
    mockedRoomsApi.delete.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDeleteRoom(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("room-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedRoomsApi.delete).toHaveBeenCalledWith(
      "room-1",
      expect.anything()
    );
  });
});

describe("useCreateMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a message", async () => {
    mockedMessagesApi.create.mockResolvedValueOnce(mockMessage);

    const { result } = renderHook(() => useCreateMessage(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ roomId: "room-1", content: "Hello" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete a message", async () => {
    mockedMessagesApi.delete.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDeleteMessage(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ roomId: "room-1", messageId: "msg-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
