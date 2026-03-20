import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";

// Must mock before importing the component
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

jest.mock("@/stores/auth-store", () => ({
  useAuthStore: jest.fn(),
}));

import LoginScreen from "@/app/(auth)/login";

import { router } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";

const mockedUseAuthStore = useAuthStore as unknown as jest.Mock;

describe("LoginScreen", () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ login: mockLogin })
    );
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  it("should render login form", () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    expect(getByText("Welcome Back")).toBeTruthy();
    expect(getByText("Sign in to your account")).toBeTruthy();
    expect(getByPlaceholderText("Email")).toBeTruthy();
    expect(getByPlaceholderText("Password")).toBeTruthy();
    expect(getByText("Sign In")).toBeTruthy();
  });

  it("should show alert when fields are empty", () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText("Sign In"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Error",
      "Please fill in all fields"
    );
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("should call login and navigate on success", async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "password123");
    fireEvent.press(getByText("Sign In"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
      expect(router.replace).toHaveBeenCalledWith("/(app)/notes");
    });
  });

  it("should show error alert on login failure", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Invalid credentials"));

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "wrong");
    fireEvent.press(getByText("Sign In"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Error", "Invalid credentials");
    });
  });

  it("should show 'Signing in...' while loading", async () => {
    // Make login never resolve during this test
    mockLogin.mockReturnValueOnce(new Promise(() => {}));

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
    fireEvent.changeText(getByPlaceholderText("Password"), "password123");
    fireEvent.press(getByText("Sign In"));

    await waitFor(() => {
      expect(getByText("Signing in...")).toBeTruthy();
    });
  });

  it("should have a link to signup", () => {
    const { getByText } = render(<LoginScreen />);

    expect(getByText("Sign Up")).toBeTruthy();
  });
});
