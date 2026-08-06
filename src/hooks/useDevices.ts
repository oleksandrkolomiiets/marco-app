import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDevices, revokeDevice, revokeOtherDevices } from '@/api/devices';
import { useAuthStore } from '@/stores/authStore';
import type { ConnectedDevice } from '@/types/api';

export const devicesQueryKey = ['devices'] as const;

export const useDevices = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<ConnectedDevice[]>({
    queryKey: devicesQueryKey,
    queryFn: getDevices,
    enabled: isAuthenticated,
    // last_seen_at only moves when a device refreshes its token, so there's
    // nothing to gain from a short stale time — but don't cache across a visit
    // either, since the point of opening this screen is to see it now.
    staleTime: 0,
  });
};

export const useRevokeDevice = () => {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useMutation({
    mutationFn: revokeDevice,
    onSuccess: (result) => {
      // Signing out the device you're holding is allowed. The tokens are dead
      // the moment the server answers, so drop them here rather than letting
      // the next request 401 its way to the same place.
      if (result.signed_out_self) {
        clearAuth();
        return;
      }
      void queryClient.invalidateQueries({ queryKey: devicesQueryKey });
    },
  });
};

export const useRevokeOtherDevices = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeOtherDevices,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: devicesQueryKey });
    },
  });
};
