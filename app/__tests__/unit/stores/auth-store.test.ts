import * as SecureStore from "expo-secure-store";

import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

// Mock the api module
jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore> & {
  __clear: () => void;
};

describe("useAuthStore", () => {
  beforeEach(() => {
    // Reset the store
    useAuthStore.setState({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    });
    jest.clearAllMocks();
    mockedSecureStore.__clear();
  });

  describe("initial state", () => {
    it("should have correct initial values", () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(true);
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe("login", () => {
    it("should store tokens and set user on successful login", async () => {
      const mockUser = { id: "user-1", email: "test@example.com" };
      mockedApi.post.mockResolvedValueOnce({
        data: {
          access_token: "access-123",
          refresh_token: "refresh-123",
          user: mockUser,
        },
      });

      await useAuthStore.getState().login("test@example.com", "password123");

      expect(mockedApi.post).toHaveBeenCalledWith("/auth/login", {
        email: "test@example.com",
        password: "password123",
      });
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "access_token",
        "access-123"
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "refresh_token",
        "refresh-123"
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "user",
        JSON.stringify(mockUser)
      );

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it("should throw on failed login", async () => {
      mockedApi.post.mockRejectedValueOnce(new Error("Invalid credentials"));

      await expect(
        useAuthStore.getState().login("bad@example.com", "wrong")
      ).rejects.toThrow("Invalid credentials");

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe("signup", () => {
    it("should store tokens and set user on successful signup", async () => {
      const mockUser = { id: "user-2", email: "new@example.com" };
      mockedApi.post.mockResolvedValueOnce({
        data: {
          access_token: "access-456",
          refresh_token: "refresh-456",
          user: mockUser,
        },
      });

      await useAuthStore.getState().signup("new@example.com", "password123");

      expect(mockedApi.post).toHaveBeenCalledWith("/auth/signup", {
        email: "new@example.com",
        password: "password123",
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe("logout", () => {
    it("should clear tokens and reset state", async () => {
      // First login
      useAuthStore.setState({
        user: { id: "user-1", email: "test@example.com" },
        isAuthenticated: true,
      });
      mockedApi.post.mockResolvedValueOnce({ data: {} });

      await useAuthStore.getState().logout();

      expect(mockedApi.post).toHaveBeenCalledWith("/auth/logout");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("access_token");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("refresh_token");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("user");

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe("hydrate", () => {
    it("should restore authenticated state when token is valid", async () => {
      const mockUser = { id: "user-1", email: "test@example.com" };
      mockedSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === "access_token") return Promise.resolve("valid-token");
        if (key === "user") return Promise.resolve(JSON.stringify(mockUser));
        return Promise.resolve(null);
      });
      mockedApi.get.mockResolvedValueOnce({ data: [] });

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it("should clear state when token is invalid", async () => {
      mockedSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === "access_token") return Promise.resolve("expired-token");
        return Promise.resolve(null);
      });
      mockedApi.get.mockRejectedValueOnce(new Error("401 Unauthorized"));

      await useAuthStore.getState().hydrate();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("access_token");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("refresh_token");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("user");

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it("should set isLoading false when no token exists", async () => {
      mockedSecureStore.getItemAsync.mockResolvedValue(null);

      await useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe("requestPasswordReset", () => {
    it("should call password reset endpoint", async () => {
      mockedApi.post.mockResolvedValueOnce({ data: {} });

      await useAuthStore.getState().requestPasswordReset("test@example.com");

      expect(mockedApi.post).toHaveBeenCalledWith("/auth/password-reset", {
        email: "test@example.com",
      });
    });
  });

  describe("deleteAccount", () => {
    it("should delete account and clear state", async () => {
      useAuthStore.setState({
        user: { id: "user-1", email: "test@example.com" },
        isAuthenticated: true,
      });
      mockedApi.delete.mockResolvedValueOnce({ data: {} });

      await useAuthStore.getState().deleteAccount();

      expect(mockedApi.delete).toHaveBeenCalledWith("/auth/account");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("access_token");

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
