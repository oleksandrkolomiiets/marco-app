import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '@/stores/authStore';
import type { RefreshTokenResponse } from '@/types/api';

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Endpoints that establish a session rather than use one. A 401 from these is
// the server rejecting credentials, not an expired access token, and there is
// nothing to refresh. /auth/signout is deliberately absent: it authenticates
// like any other call.
const CREDENTIAL_ENDPOINTS = ['/auth/signin', '/auth/signup', '/auth/google'];

const isCredentialEndpoint = (url: string | undefined): boolean =>
  url !== undefined && CREDENTIAL_ENDPOINTS.some((path) => url.includes(path));

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

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
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

apiClient.interceptors.response.use(
  (res) => res.data,
  async (error: AxiosError<{ error?: string }>) => {
    const original = error.config as RetryableRequestConfig | undefined;
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
        throw new Error(error.response?.data?.error ?? error.message);
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
        throw new Error(error.response?.data?.error ?? error.message);
      }
    }
    throw new Error(error.response?.data?.error ?? error.message);
  },
);

export const api = {
  get: <T>(url: string, params?: object): Promise<T> =>
    apiClient.get(url, { params }) as unknown as Promise<T>,
  post: <T>(url: string, data?: object): Promise<T> =>
    apiClient.post(url, data) as unknown as Promise<T>,
  patch: <T>(url: string, data?: object): Promise<T> =>
    apiClient.patch(url, data) as unknown as Promise<T>,
  delete: <T>(url: string): Promise<T> =>
    apiClient.delete(url) as unknown as Promise<T>,
};
