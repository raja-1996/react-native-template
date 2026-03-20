import { render } from "@testing-library/react-native";
import React from "react";

import { useAuthStore } from "@/stores/auth-store";

jest.mock("@/stores/auth-store", () => ({
  useAuthStore: jest.fn(),
}));

// Re-mock expo-router to capture Redirect calls
jest.mock("expo-router", () => ({
  Redirect: jest.fn(({ href }: { href: string }) => {
    const { Text } = require("react-native");
    return <Text testID="redirect">{href}</Text>;
  }),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

import Index from "@/app/index";

const mockedUseAuthStore = useAuthStore as unknown as jest.Mock;

describe("Index (Auth Guard)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should show loading indicator while hydrating", () => {
    mockedUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    const { UNSAFE_queryByType } = render(<Index />);
    const { ActivityIndicator } = require("react-native");
    expect(UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
  });

  it("should redirect to notes when authenticated", () => {
    mockedUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    const { getByTestId } = render(<Index />);
    expect(getByTestId("redirect").props.children).toBe("/(app)/notes");
  });

  it("should redirect to login when not authenticated", () => {
    mockedUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    const { getByTestId } = render(<Index />);
    expect(getByTestId("redirect").props.children).toBe("/(auth)/login");
  });
});
