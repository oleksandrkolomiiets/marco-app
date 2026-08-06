// EXPO_PUBLIC_API_URL is captured by client.ts at import time. jest.setup.ts
// (a "setupFiles" entry) sets it to https://api.test before any test module —
// and therefore client.ts — is loaded, so a static import is safe here.
import {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import * as SecureStore from 'expo-secure-store';
import { api, apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

type SecureStoreReset = { __reset: () => void };

const ok = <T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

// Build the AxiosError a real adapter would reject with for an HTTP error.
const httpError = (
  config: InternalAxiosRequestConfig,
  status: number,
  data: object,
): AxiosError => {
  const response: AxiosResponse = {
    data,
    status,
    statusText: `${status}`,
    headers: {},
    config,
  };
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_REQUEST',
    config,
    undefined,
    response,
  );
};

describe('api client', () => {
  let adapter: jest.Mock<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>;

  beforeEach(() => {
    (SecureStore as unknown as SecureStoreReset).__reset();
    jest.clearAllMocks();
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    adapter = jest.fn();
    apiClient.defaults.adapter = adapter;
  });

  describe('request interceptor', () => {
    it('attaches the Authorization header when an access token is stored', async () => {
      useAuthStore.setState({ accessToken: 'tok-1' });
      adapter.mockImplementation(async (config) => ok(config, {}));

      await api.get('/ping');

      const config = adapter.mock.calls[0]?.[0];
      expect(config).toBeDefined();
      expect(config?.headers.get('Authorization')).toBe('Bearer tok-1');
    });

    it('omits the Authorization header when no access token is stored', async () => {
      adapter.mockImplementation(async (config) => ok(config, {}));

      await api.get('/ping');

      const config = adapter.mock.calls[0]?.[0];
      expect(config).toBeDefined();
      expect(config?.headers.has('Authorization')).toBe(false);
    });
  });

  describe('response unwrapping', () => {
    it('resolves with the response body directly', async () => {
      adapter.mockImplementation(async (config) => ok(config, { hello: 'world' }));

      const result = await api.get<{ hello: string }>('/greeting');

      expect(result).toEqual({ hello: 'world' });
      const config = adapter.mock.calls[0]?.[0];
      expect(config?.baseURL).toBe('https://api.test');
      expect(config?.url).toBe('/greeting');
    });
  });

  describe('401 refresh flow', () => {
    it('refreshes, persists rotated tokens even with a null user, and retries', async () => {
      useAuthStore.setState({
        accessToken: 'old-access',
        refreshToken: 'old-refresh',
        user: null,
        isAuthenticated: true,
      });

      adapter.mockImplementation(async (config) => {
        if (config.url === '/auth/refresh') {
          return ok(config, {
            access_token: 'new-access',
            refresh_token: 'new-refresh',
            expires_in: 900,
          });
        }
        if (config.headers.get('Authorization') === 'Bearer new-access') {
          return ok(config, { secret: 42 });
        }
        throw httpError(config, 401, { error: 'token expired' });
      });

      const result = await api.get<{ secret: number }>('/protected');
      expect(result).toEqual({ secret: 42 });

      // The refresh endpoint was called with the stored refresh token.
      const refreshCall = adapter.mock.calls.find(
        ([config]) => config.url === '/auth/refresh',
      );
      expect(refreshCall).toBeDefined();
      expect(JSON.parse(refreshCall?.[0].data as string)).toEqual({
        refresh_token: 'old-refresh',
      });

      // Rotated pair persisted even though no user is cached (regression:
      // tokens must be saved without a cached user).
      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('new-access');
      expect(state.refreshToken).toBe('new-refresh');
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toBeNull();
      await expect(SecureStore.getItemAsync('access_token')).resolves.toBe(
        'new-access',
      );
      await expect(SecureStore.getItemAsync('refresh_token')).resolves.toBe(
        'new-refresh',
      );

      // Initial request, refresh, retried request.
      expect(adapter).toHaveBeenCalledTimes(3);
    });

    it('shares one in-flight refresh between concurrent 401s', async () => {
      useAuthStore.setState({
        accessToken: 'old-access',
        refreshToken: 'old-refresh',
        user: null,
        isAuthenticated: true,
      });

      let refreshCalls = 0;
      adapter.mockImplementation(async (config) => {
        if (config.url === '/auth/refresh') {
          refreshCalls += 1;
          // Stay in flight long enough for both 401s to join this refresh.
          await new Promise((resolve) => setTimeout(resolve, 20));
          return ok(config, {
            access_token: 'new-access',
            refresh_token: 'new-refresh',
            expires_in: 900,
          });
        }
        if (config.headers.get('Authorization') === 'Bearer new-access') {
          return ok(config, { url: config.url });
        }
        throw httpError(config, 401, { error: 'token expired' });
      });

      const [a, b] = await Promise.all([
        api.get<{ url?: string }>('/a'),
        api.get<{ url?: string }>('/b'),
      ]);

      expect(a).toEqual({ url: '/a' });
      expect(b).toEqual({ url: '/b' });
      expect(refreshCalls).toBe(1);
      // /a, /b, one shared refresh, retried /a, retried /b.
      expect(adapter).toHaveBeenCalledTimes(5);
      expect(useAuthStore.getState().accessToken).toBe('new-access');
    });

    it('clears auth and rejects when the refresh request itself 401s', async () => {
      await SecureStore.setItemAsync('access_token', 'old-access');
      await SecureStore.setItemAsync('refresh_token', 'dead-refresh');
      useAuthStore.setState({
        accessToken: 'old-access',
        refreshToken: 'dead-refresh',
        user: null,
        isAuthenticated: true,
      });

      adapter.mockImplementation(async (config) => {
        throw httpError(
          config,
          401,
          config.url === '/auth/refresh'
            ? { error: 'refresh token revoked' }
            : { error: 'token expired' },
        );
      });

      await expect(api.get('/protected')).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      await expect(SecureStore.getItemAsync('access_token')).resolves.toBeNull();
      await expect(SecureStore.getItemAsync('refresh_token')).resolves.toBeNull();
    });
  });

  describe('401 from the credential endpoints', () => {
    // Signing in with a wrong password is a 401, but there is no session to
    // refresh — the screen matches on the server's code to decide which field
    // to put the error under.
    it.each([
      ['/auth/signin', 'These credentials do not match our records.'],
      ['/auth/signup', 'email already registered'],
      ['/auth/google', 'invalid id token'],
    ])('surfaces the server error from %s and does not refresh', async (url, serverError) => {
      adapter.mockImplementation(async (config) => {
        throw httpError(config, 401, { error: serverError });
      });

      await expect(api.post(url, { email: 'a@b.c' })).rejects.toThrow(serverError);
      expect(adapter).toHaveBeenCalledTimes(1);
    });

    it('leaves an existing session alone when a sign-in attempt 401s', async () => {
      useAuthStore.setState({
        accessToken: 'live-access',
        refreshToken: 'live-refresh',
        user: null,
        isAuthenticated: true,
      });
      adapter.mockImplementation(async (config) => {
        throw httpError(config, 401, {
          error: 'These credentials do not match our records.',
        });
      });

      await expect(
        api.post('/auth/signin', { email: 'a@b.c', password: 'nope' }),
      ).rejects.toThrow('do not match our records');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('still refreshes on a 401 from an authenticated auth route', async () => {
      useAuthStore.setState({
        accessToken: 'old-access',
        refreshToken: 'good-refresh',
        user: null,
        isAuthenticated: true,
      });
      adapter.mockImplementation(async (config) => {
        if (config.url === '/auth/refresh') {
          return ok(config, { access_token: 'new-access', refresh_token: 'new-refresh' });
        }
        if (config.headers?.get?.('Authorization') === 'Bearer new-access') {
          return ok(config, { done: true });
        }
        throw httpError(config, 401, { error: 'token expired' });
      });

      await expect(api.post('/auth/signout', {})).resolves.toEqual({ done: true });
      expect(useAuthStore.getState().accessToken).toBe('new-access');
    });
  });

  describe('a failed refresh', () => {
    it('rejects with the server error, not the raw axios message', async () => {
      useAuthStore.setState({
        accessToken: 'old-access',
        refreshToken: 'dead-refresh',
        user: null,
        isAuthenticated: true,
      });
      adapter.mockImplementation(async (config) => {
        throw httpError(
          config,
          401,
          config.url === '/auth/refresh'
            ? { error: 'refresh token revoked' }
            : { error: 'token expired' },
        );
      });

      await expect(api.get('/protected')).rejects.toThrow('token expired');
    });
  });

  describe('non-401 errors', () => {
    it('rejects with the backend error string', async () => {
      adapter.mockImplementation(async (config) => {
        throw httpError(config, 500, { error: 'database exploded' });
      });

      await expect(api.get('/boom')).rejects.toThrow('database exploded');
      // No refresh attempt was made.
      expect(adapter).toHaveBeenCalledTimes(1);
    });

    it('falls back to the axios message when the body has no error string', async () => {
      adapter.mockImplementation(async (config) => {
        throw httpError(config, 503, {});
      });

      await expect(api.get('/down')).rejects.toThrow(
        'Request failed with status code 503',
      );
    });

    // A timeout has no response to read a message off, so the fallback above
    // used to hand the screen axios's own "timeout of 10000ms exceeded" —
    // which the prep sheet rendered verbatim under OR PICK FROM MARCO.
    it.each([['ECONNABORTED'], ['ETIMEDOUT']])(
      'rejects with a readable message when the request times out (%s)',
      async (code) => {
        adapter.mockImplementation(async (config) => {
          throw new AxiosError(
            'timeout of 10000ms exceeded',
            code,
            config,
            undefined,
            undefined,
          );
        });

        await expect(api.get('/slow')).rejects.toThrow(
          'That took too long to come back. Try again.',
        );
      },
    );
  });

  describe('a revoked device session', () => {
    it('clears the session without trying to refresh', async () => {
      useAuthStore.setState({
        accessToken: 'dead-access',
        refreshToken: 'dead-refresh',
        isAuthenticated: true,
      });
      adapter.mockImplementation(async (config) => {
        throw httpError(config, 401, { error: 'session_revoked' });
      });

      await expect(api.get('/api/v1/me')).rejects.toThrow('This device was signed out.');

      // One call: the refresh token died with the session, so attempting a
      // refresh could only fail.
      expect(adapter).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().accessToken).toBeNull();
    });
  });

  describe('device headers', () => {
    it('identifies the device on every request', async () => {
      adapter.mockImplementation(async (config) => ok(config, { ok: true }));

      await api.get('/api/v1/me');

      const sent = adapter.mock.calls[0]?.[0];
      expect(sent?.headers?.['X-Device-Platform']).toBeDefined();
    });
  });

  describe('per-request config', () => {
    it('passes a timeout override through to the request', async () => {
      adapter.mockImplementation(async (config) => ok(config, { ok: true }));

      await api.post('/slow', undefined, { timeout: 45000 });

      expect(adapter.mock.calls[0]?.[0]?.timeout).toBe(45000);
    });

    it('leaves the default timeout in place when no config is given', async () => {
      adapter.mockImplementation(async (config) => ok(config, { ok: true }));

      await api.post('/quick');

      expect(adapter.mock.calls[0]?.[0]?.timeout).toBe(10000);
    });
  });
});
