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
import { useCreateRoom, useDeleteRoom, useRooms } from "@/hooks/use-notes";
import { useAuthStore } from "@/stores/auth-store";

jest.mock("@/hooks/use-notes", () => ({
  useRooms: jest.fn(),
  useCreateRoom: jest.fn(),
  useDeleteRoom: jest.fn(),
}));

jest.mock("@/stores/auth-store", () => ({
  useAuthStore: jest.fn(),
}));

import RoomsScreen from "@/app/(app)/rooms";

const mockedUseRooms = useRooms as jest.Mock;
const mockedUseDeleteRoom = useDeleteRoom as jest.Mock;
const mockedUseCreateRoom = useCreateRoom as jest.Mock;
const mockedUseAuthStore = useAuthStore as unknown as jest.Mock;

const mockRooms = [
  {
    id: "room-1",
    name: "General",
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "room-2",
    name: "Random",
    created_by: "user-1",
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

describe("RoomsScreen", () => {
  const mockMutate = jest.fn();
  const mockMutateAsync = jest.fn();
  const mockLogout = jest.fn();
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseDeleteRoom.mockReturnValue({ mutate: mockMutate });
    mockedUseCreateRoom.mockReturnValue({ mutateAsync: mockMutateAsync });
    mockedUseAuthStore.mockImplementation(
      (selector: (s: unknown) => unknown) =>
        selector({ logout: mockLogout })
    );
  });

  it("should show loading indicator when loading", () => {
    mockedUseRooms.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: mockRefetch,
    });

    const { UNSAFE_queryByType } = render(
      <Wrapper>
        <RoomsScreen />
      </Wrapper>
    );

    const { ActivityIndicator } = require("react-native");
    expect(UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
  });

  it("should show empty state when no rooms", () => {
    mockedUseRooms.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(
      <Wrapper>
        <RoomsScreen />
      </Wrapper>
    );

    expect(getByText("No rooms yet")).toBeTruthy();
    expect(getByText("Tap + to create your first chat room")).toBeTruthy();
  });

  it("should render rooms list", () => {
    mockedUseRooms.mockReturnValue({
      data: mockRooms,
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(
      <Wrapper>
        <RoomsScreen />
      </Wrapper>
    );

    expect(getByText("General")).toBeTruthy();
    expect(getByText("Random")).toBeTruthy();
  });

  it("should open modal when FAB is pressed", () => {
    mockedUseRooms.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(
      <Wrapper>
        <RoomsScreen />
      </Wrapper>
    );

    fireEvent.press(getByText("+"));

    expect(getByText("New Room")).toBeTruthy();
  });

  it("should call logout and redirect when logout is pressed", async () => {
    mockedUseRooms.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: mockRefetch,
    });
    mockLogout.mockResolvedValueOnce(undefined);

    const { getByText } = render(
      <Wrapper>
        <RoomsScreen />
      </Wrapper>
    );

    fireEvent.press(getByText("Logout"));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith("/");
    });
  });

  it("should navigate to chat when room is pressed", () => {
    mockedUseRooms.mockReturnValue({
      data: [mockRooms[0]],
      isLoading: false,
      refetch: mockRefetch,
    });

    const { getByText } = render(
      <Wrapper>
        <RoomsScreen />
      </Wrapper>
    );

    fireEvent.press(getByText("General"));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/(app)/chat",
      params: { id: "room-1", name: "General" },
    });
  });
});
