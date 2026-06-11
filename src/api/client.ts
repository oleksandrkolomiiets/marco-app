import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '@/stores/authStore';
import type { RefreshTokenResponse } from '@/types/api';

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

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
// launching their own refresh call.
let refreshPromise: Promise<RefreshTokenResponse> | null = null;

apiClient.interceptors.response.use(
  (res) => res.data,
  async (error: AxiosError<{ error?: string }>) => {
    const original = error.config as RetryableRequestConfig | undefined;
    if (error.response?.status === 401 && original && !original._retry) {
      // The refresh call itself 401ed — tokens are dead, sign out immediately.
      if (original.url?.includes('/auth/refresh')) {
        useAuthStore.getState().clearAuth();
        throw new Error(error.response?.data?.error ?? error.message);
      }

      original._retry = true;
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
        original.headers.set('Authorization', `Bearer ${data.access_token}`);
        return apiClient(original);
      } catch {
        useAuthStore.getState().clearAuth();
        throw error;
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
