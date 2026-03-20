import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import api from "../lib/api";

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (
    accessToken: string,
    newPassword: string
  ) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync("access_token");
    if (token) {
      try {
        // Validate token by calling a protected endpoint
        await api.get("/rooms");
        const userJson = await SecureStore.getItemAsync("user");
        const user = userJson ? JSON.parse(userJson) : null;
        set({ user, isAuthenticated: true, isLoading: false });
      } catch {
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");
        await SecureStore.deleteItemAsync("user");
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    await SecureStore.setItemAsync("access_token", data.access_token);
    await SecureStore.setItemAsync("refresh_token", data.refresh_token);
    await SecureStore.setItemAsync("user", JSON.stringify(data.user));
    set({ user: data.user, isAuthenticated: true });
  },

  signup: async (email, password) => {
    const { data } = await api.post("/auth/signup", { email, password });
    await SecureStore.setItemAsync("access_token", data.access_token);
    await SecureStore.setItemAsync("refresh_token", data.refresh_token);
    await SecureStore.setItemAsync("user", JSON.stringify(data.user));
    set({ user: data.user, isAuthenticated: true });
  },

  logout: async () => {
    await api.post("/auth/logout");
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    await SecureStore.deleteItemAsync("user");
    set({ user: null, isAuthenticated: false });
  },

  requestPasswordReset: async (email) => {
    await api.post("/auth/password-reset", { email });
  },

  confirmPasswordReset: async (accessToken, newPassword) => {
    await api.post("/auth/password-reset/confirm", {
      access_token: accessToken,
      new_password: newPassword,
    });
  },

  deleteAccount: async () => {
    await api.delete("/auth/account");
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    await SecureStore.deleteItemAsync("user");
    set({ user: null, isAuthenticated: false });
  },
}));
