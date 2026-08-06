import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { deviceHeaders } from '@/api/device';
import type { RefreshTokenResponse } from '@/types/api';

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Endpoints that establish a session rather than use one. A 401 from these is
// the server rejecting credentials, not an expired access token, and there is
// nothing to refresh. /auth/signout is deliberately absent: it authenticates
// like any other call.
const CREDENTIAL_ENDPOINTS = ['/auth/signin', '/auth/signup', '/auth/google'];

const isCredentialEndpoint = (url: string | undefined): boolean =>
  url !== undefined && CREDENTIAL_ENDPOINTS.some((path) => url.includes(path));

// axios reports a timeout as "timeout of 10000ms exceeded", and every screen
// renders whatever message it gets straight into the UI. Nobody should read a
// millisecond count off a prep sheet.
const TIMEOUT_MESSAGE = 'That took too long to come back. Try again.';

const messageFor = (error: AxiosError<{ error?: string }>): string => {
  const fromServer = error.response?.data?.error;
  if (fromServer) return fromServer;
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return TIMEOUT_MESSAGE;
  }
  return error.message;
};

const baseURL = process.env.EXPO_PUBLIC_API_URL;

// Bearer tokens ride on every request — never let a release build send them
// over cleartext HTTP. Dev builds talk to a LAN IP, so only enforce in prod.
if (!__DEV__ && baseURL && !baseURL.startsWith('https://')) {
  throw new Error('EXPO_PUBLIC_API_URL must be https:// in production builds');
}

// eslint-disable-next-line import/no-named-as-default-member -- axios.create is the canonical axios API
export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Computed once: neither the device name nor the OS version changes while the
// app is running.
const deviceMeta = deviceHeaders();

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  // On every request, not just the auth ones — the server only reads them at
  // sign-in and refresh, and keeping it unconditional means a new auth route
  // can't quietly forget to identify its device.
  for (const [key, value] of Object.entries(deviceMeta)) {
    config.headers.set(key, value);
  }
  return config;
});

// Shared in-flight refresh promise — prevents concurrent 401s from each
// launching their own refresh call. The server rotates the refresh token on
// every call, so two parallel refreshes would revoke each other's token.
let refreshPromise: Promise<RefreshTokenResponse> | null = null;

/**
 * Exchange the stored refresh token for a fresh pair, persist it, and return
 * the new access token. Concurrent callers share one in-flight request.
 * Clears the session and rethrows if the refresh itself fails.
 *
 * Exported because the chat SSE stream talks XHR (React Native's fetch cannot
 * stream), so it never passes through the response interceptor below and has
 * to drive the same refresh itself.
 */
export async function refreshSession(): Promise<string> {
  try {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) throw new Error('No refresh token');

    if (!refreshPromise) {
      refreshPromise = (api.post<RefreshTokenResponse>('/auth/refresh', {
        refresh_token: refreshToken,
      }) as Promise<RefreshTokenResponse>).finally(() => {
        refreshPromise = null;
      });
    }
    const data = await refreshPromise;

    // Always persist the rotated pair — the server already revoked the old
    // refresh token, so skipping this would strand the client logged out.
    useAuthStore.getState().updateTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch (err) {
    useAuthStore.getState().clearAuth();
    throw err;
  }
}

// The server answers this when the device's session has been signed out from
// the devices screen on another device. Refreshing cannot fix it — the refresh
// token was deleted with the session — so don't spend a round trip finding out.
const SESSION_REVOKED = 'session_revoked';

apiClient.interceptors.response.use(
  (res) => res.data,
  async (error: AxiosError<{ error?: string }>) => {
    const original = error.config as RetryableRequestConfig | undefined;
    if (
      error.response?.status === 401 &&
      error.response.data?.error === SESSION_REVOKED
    ) {
      useAuthStore.getState().clearAuth();
      throw new Error('This device was signed out.');
    }
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      // Signing in with a wrong password used to fall into the refresh branch:
      // refreshSession threw "No refresh token" (nobody is signed in), the
      // catch below rethrew the raw AxiosError, and the sign-in screen showed
      // axios's "Request failed with status code 401" instead of the server's
      // own message.
      !isCredentialEndpoint(original.url)
    ) {
      // The refresh call itself 401ed — tokens are dead, sign out immediately.
      if (original.url?.includes('/auth/refresh')) {
        useAuthStore.getState().clearAuth();
        throw new Error(messageFor(error));
      }

      original._retry = true;
      try {
        const accessToken = await refreshSession();
        original.headers.set('Authorization', `Bearer ${accessToken}`);
        // Deliberately not awaited: a retry that still 401s should reject as-is
        // rather than fall into the sign-out below.
        return apiClient(original);
      } catch {
        // refreshSession has already cleared the session; clearAuth is
        // idempotent, so this stays as a defensive backstop.
        useAuthStore.getState().clearAuth();
        // Map like every other path — rethrowing the AxiosError here handed
        // callers "Request failed with status code 401" instead of whatever
        // the server actually said.
        throw new Error(messageFor(error));
      }
    }
    throw new Error(messageFor(error));
  },
);

export const api = {
  get: <T>(url: string, params?: object): Promise<T> =>
    apiClient.get(url, { params }) as unknown as Promise<T>,
  // config is for the handful of endpoints that don't fit the 10s default —
  // anything that waits on Claude rather than on Postgres.
  post: <T>(url: string, data?: object, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.post(url, data, config) as unknown as Promise<T>,
  patch: <T>(url: string, data?: object): Promise<T> =>
    apiClient.patch(url, data) as unknown as Promise<T>,
  delete: <T>(url: string): Promise<T> =>
    apiClient.delete(url) as unknown as Promise<T>,
};
