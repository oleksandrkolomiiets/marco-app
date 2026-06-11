import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '@/types/api';

const KEYS = { access: 'access_token', refresh: 'refresh_token', user: 'user' };

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setTokens: (accessToken: string, refreshToken: string, user: User) => void;
  /** Persist rotated tokens without touching the cached user (used by the 401-refresh interceptor). */
  updateTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  loadFromStorage: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setTokens: (accessToken, refreshToken, user) => {
    void SecureStore.setItemAsync(KEYS.access, accessToken);
    void SecureStore.setItemAsync(KEYS.refresh, refreshToken);
    void SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
    set({ accessToken, refreshToken, user, isAuthenticated: true });
  },

  updateTokens: (accessToken, refreshToken) => {
    void SecureStore.setItemAsync(KEYS.access, accessToken);
    void SecureStore.setItemAsync(KEYS.refresh, refreshToken);
    set({ accessToken, refreshToken, isAuthenticated: true });
  },

  setUser: (user) => {
    void SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
    set({ user });
  },

  clearAuth: () => {
    void SecureStore.deleteItemAsync(KEYS.access);
    void SecureStore.deleteItemAsync(KEYS.refresh);
    void SecureStore.deleteItemAsync(KEYS.user);
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },

  loadFromStorage: async () => {
    try {
      const [accessToken, refreshToken, userJson] = await Promise.all([
        SecureStore.getItemAsync(KEYS.access),
        SecureStore.getItemAsync(KEYS.refresh),
        SecureStore.getItemAsync(KEYS.user),
      ]);
      if (accessToken && refreshToken) {
        let user: User | null = userJson ? (JSON.parse(userJson) as User) : null;
        if (!user) {
          try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/me`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
              user = (await res.json()) as User;
              void SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
            }
          } catch {
            // network unavailable — user stays null, gate redirects to welcome
          }
        }
        set({ accessToken, refreshToken, user, isAuthenticated: true });
      }
    } catch {
      // treat as logged out
    } finally {
      set({ isLoading: false });
    }
  },
}));
