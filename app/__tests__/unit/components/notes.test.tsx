import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  Link: ({ children }: { children: React.ReactNode }) => children,
  Redirect: () => null,
  useLocalSearchParams: jest.fn(() => ({})),
}));

import { router } from "expo-router";
import { useDeleteNote, useNotes } from "@/hooks/use-notes";
import { useRealtimeNotes } from "@/hooks/use-realtime-notes";
import { useAuthStore } from "@/stores/auth-store";

jest.mock("@/hooks/use-notes", () => ({
  useNotes: jest.fn(),
  useDeleteNote: jest.fn(),
}));

jest.mock("@/hooks/use-realtime-notes", () => ({
  useRealtimeNotes: jest.fn(),
}));

jest.mock("@/stores/auth-store", () => ({
  useAuthStore: jest.fn(),
}));

import NotesScreen from "@/app/(app)/notes";

const mockedUseNotes = useNotes as jest.Mock;
const mockedUseDeleteNote = useDeleteNote as jest.Mock;
const mockedUseAuthStore = useAuthStore as unknown as jest.Mock;

const mockNotes = [
  {
    id: "note-1",
    user_id: "user-1",
    title: "First Note",
    content: "First content",
    attachment_path: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "note-2",
    user_id: "user-1",
    title: "Second Note",
    content: "Second content",
    attachment_path: "uploads/file.pdf",
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  },
];

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("NotesScreen", () => {
  const mockMutate = jest.fn();
  const mockLogout = jest.fn();
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseDeleteNote.mockReturnValue({ mutate: mockMutate });
    mockedUseAuthStore.mockImplementation(
      (selector: (s: unknown) => unknown) =>
        selector({ logout: mockLogout })
    );
    (useRealtimeNotes as jest.Mock).mockImplementation(() => {});
  });

  it("should show loading indicator when loading", () => {
    mockedUseNotes.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: mockRefetch,
    });

    const { getByTestId, UNSAFE_queryByType } = render(
      <Wrapper>
        <NotesScreen />
      </Wrapper>
    );

    // ActivityIndicator should be rendered
    const { ActivityIndicator } = require("react-native");
    expect(UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
  });

  it("should show empty state when no notes", () => {
    mockedUseNotes.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(
      <Wrapper>
        <NotesScreen />
      </Wrapper>
    );

    expect(getByText("No notes yet")).toBeTruthy();
    expect(getByText("Tap + to create your first note")).toBeTruthy();
  });

  it("should render notes list", () => {
    mockedUseNotes.mockReturnValue({
      data: mockNotes,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(
      <Wrapper>
        <NotesScreen />
      </Wrapper>
    );

    expect(getByText("First Note")).toBeTruthy();
    expect(getByText("Second Note")).toBeTruthy();
  });

  it("should navigate to editor when FAB is pressed", () => {
    mockedUseNotes.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(
      <Wrapper>
        <NotesScreen />
      </Wrapper>
    );

    fireEvent.press(getByText("+"));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/(app)/note-editor",
    });
  });

  it("should call logout and redirect when logout is pressed", async () => {
    mockedUseNotes.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: mockRefetch,
    });
    mockLogout.mockResolvedValueOnce(undefined);

    const { getByText } = render(
      <Wrapper>
        <NotesScreen />
      </Wrapper>
    );

    fireEvent.press(getByText("Logout"));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });

  it("should delete a note when delete button is pressed", () => {
    mockedUseNotes.mockReturnValue({
      data: [mockNotes[0]],
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(
      <Wrapper>
        <NotesScreen />
      </Wrapper>
    );

    fireEvent.press(getByText("×"));

    expect(mockMutate).toHaveBeenCalledWith("note-1");
  });

  it("should show attachment indicator for notes with attachments", () => {
    mockedUseNotes.mockReturnValue({
      data: [mockNotes[1]],
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(
      <Wrapper>
        <NotesScreen />
      </Wrapper>
    );

    expect(getByText(/Attachment/)).toBeTruthy();
  });
});
