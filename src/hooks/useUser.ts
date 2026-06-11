import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/api/users';
import { useAuthStore } from '@/stores/authStore';

export const userQueryKey = ['user'] as const;

export const useUser = () => {
  const storedUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: userQueryKey,
    queryFn: async () => {
      const fresh = await getMe();
      setUser(fresh);
      return fresh;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    initialData: storedUser ?? undefined,
  });

  return {
    user: query.data ?? storedUser,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
