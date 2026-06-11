import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types/api';

// Shape of the in-memory mock installed in jest.setup.ts.
type SecureStoreMock = {
  getItemAsync: jest.Mock<Promise<string | null>, [string]>;
  setItemAsync: jest.Mock<Promise<void>, [string, string]>;
  deleteItemAsync: jest.Mock<Promise<void>, [string]>;
  __reset: () => void;
};

const secureStore = SecureStore as unknown as SecureStoreMock;

const testUser: User = {
  id: 'user-1',
  email: 'padel@example.com',
  display_name: 'Padel Pat',
  skill_level: 'intermediate',
  dominant_hand: 'right',
  court_side: 'left',
  play_frequency: 'weekly',
  goal: 'master the bandeja',
  plan: 'free',
  created_at: '2026-01-01T00:00:00Z',
};

const initialState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
} as const;

const realFetch = globalThis.fetch;

describe('useAuthStore', () => {
  beforeEach(() => {
    secureStore.__reset();
    jest.clearAllMocks();
    useAuthStore.setState(initialState);
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  describe('setTokens', () => {
    it('persists both tokens and the user to SecureStore and authenticates', () => {
      useAuthStore.getState().setTokens('acc-1', 'ref-1', testUser);

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('acc-1');
      expect(state.refreshToken).toBe('ref-1');
      expect(state.user).toEqual(testUser);
      expect(state.isAuthenticated).toBe(true);

      expect(secureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'acc-1');
      expect(secureStore.setItemAsync).toHaveBeenCalledWith('refresh_token', 'ref-1');
      expect(secureStore.setItemAsync).toHaveBeenCalledWith(
        'user',
        JSON.stringify(testUser),
      );
    });
  });

  describe('updateTokens', () => {
    it('persists rotated tokens without touching the cached user', async () => {
      useAuthStore.getState().setTokens('acc-1', 'ref-1', testUser);
      secureStore.setItemAsync.mockClear();

      useAuthStore.getState().updateTokens('acc-2', 'ref-2');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('acc-2');
      expect(state.refreshToken).toBe('ref-2');
      expect(state.user).toEqual(testUser);
      expect(state.isAuthenticated).toBe(true);

      expect(secureStore.setItemAsync).toHaveBeenCalledWith('access_token', 'acc-2');
      expect(secureStore.setItemAsync).toHaveBeenCalledWith('refresh_token', 'ref-2');
      expect(secureStore.setItemAsync).not.toHaveBeenCalledWith(
        'user',
        expect.anything(),
      );
      // The previously stored user snapshot is still intact.
      await expect(secureStore.getItemAsync('user')).resolves.toBe(
        JSON.stringify(testUser),
      );
    });

    it('keeps isAuthenticated true when no user was ever cached', () => {
      useAuthStore.setState({
        accessToken: 'acc-1',
        refreshToken: 'ref-1',
        user: null,
        isAuthenticated: true,
      });

      useAuthStore.getState().updateTokens('acc-2', 'ref-2');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBe('acc-2');
      expect(state.refreshToken).toBe('ref-2');
    });
  });

  describe('clearAuth', () => {
    it('wipes the SecureStore keys and resets state', async () => {
      useAuthStore.getState().setTokens('acc-1', 'ref-1', testUser);

      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);

      expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
      expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('refresh_token');
      expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('user');
      await expect(secureStore.getItemAsync('access_token')).resolves.toBeNull();
      await expect(secureStore.getItemAsync('refresh_token')).resolves.toBeNull();
      await expect(secureStore.getItemAsync('user')).resolves.toBeNull();
    });
  });

  describe('loadFromStorage', () => {
    it('restores state when tokens and user are stored', async () => {
      await SecureStore.setItemAsync('access_token', 'acc-1');
      await SecureStore.setItemAsync('refresh_token', 'ref-1');
      await SecureStore.setItemAsync('user', JSON.stringify(testUser));
      const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await useAuthStore.getState().loadFromStorage();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('acc-1');
      expect(state.refreshToken).toBe('ref-1');
      expect(state.user).toEqual(testUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('stays logged out when nothing is stored', async () => {
      const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await useAuthStore.getState().loadFromStorage();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('fetches and persists the user when tokens exist but the user JSON is missing', async () => {
      await SecureStore.setItemAsync('access_token', 'acc-1');
      await SecureStore.setItemAsync('refresh_token', 'ref-1');
      const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>(
        async () =>
          ({ ok: true, json: async () => testUser }) as unknown as Response,
      );
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await useAuthStore.getState().loadFromStorage();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/v1/me', {
        headers: { Authorization: 'Bearer acc-1' },
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(testUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      // The fetched user is persisted for the next cold start.
      await expect(secureStore.getItemAsync('user')).resolves.toBe(
        JSON.stringify(testUser),
      );
    });

    it('still authenticates with a null user when the user fetch fails', async () => {
      await SecureStore.setItemAsync('access_token', 'acc-1');
      await SecureStore.setItemAsync('refresh_token', 'ref-1');
      const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>(
        async () => {
          throw new Error('network unavailable');
        },
      );
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await useAuthStore.getState().loadFromStorage();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('acc-1');
      expect(state.refreshToken).toBe('ref-1');
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });
  });
});
