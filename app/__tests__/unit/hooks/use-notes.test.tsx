import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import {
  useCreateNote,
  useDeleteNote,
  useNote,
  useNotes,
  useUpdateNote,
} from "@/hooks/use-notes";
import { notesApi } from "@/services/notes";

jest.mock("@/services/notes", () => ({
  notesApi: {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedNotesApi = notesApi as jest.Mocked<typeof notesApi>;

const mockNote = {
  id: "note-1",
  user_id: "user-1",
  title: "Test Note",
  content: "Content here",
  attachment_path: null,
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

describe("useNotes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch notes list", async () => {
    mockedNotesApi.list.mockResolvedValueOnce([mockNote]);

    const { result } = renderHook(() => useNotes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([mockNote]);
    expect(mockedNotesApi.list).toHaveBeenCalledTimes(1);
  });

  it("should handle empty notes list", async () => {
    mockedNotesApi.list.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useNotes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("should handle fetch error", async () => {
    mockedNotesApi.list.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useNotes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Network error");
  });
});

describe("useNote", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch a single note", async () => {
    mockedNotesApi.get.mockResolvedValueOnce(mockNote);

    const { result } = renderHook(() => useNote("note-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockNote);
    expect(mockedNotesApi.get).toHaveBeenCalledWith("note-1");
  });

  it("should not fetch when id is empty", () => {
    const { result } = renderHook(() => useNote(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedNotesApi.get).not.toHaveBeenCalled();
  });
});

describe("useCreateNote", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a note and invalidate queries", async () => {
    const newNote = { ...mockNote, id: "note-2", title: "New Note" };
    mockedNotesApi.create.mockResolvedValueOnce(newNote);

    const { result } = renderHook(() => useCreateNote(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: "New Note", content: "Content" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedNotesApi.create).toHaveBeenCalledWith(
      { title: "New Note", content: "Content" },
      expect.anything()
    );
  });
});

describe("useUpdateNote", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update a note", async () => {
    const updatedNote = { ...mockNote, title: "Updated" };
    mockedNotesApi.update.mockResolvedValueOnce(updatedNote);

    const { result } = renderHook(() => useUpdateNote(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "note-1", title: "Updated" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedNotesApi.update).toHaveBeenCalledWith("note-1", {
      title: "Updated",
    });
  });
});

describe("useDeleteNote", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete a note", async () => {
    mockedNotesApi.delete.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDeleteNote(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("note-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedNotesApi.delete).toHaveBeenCalledWith(
      "note-1",
      expect.anything()
    );
  });
});
