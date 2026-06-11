import { useQuery } from '@tanstack/react-query';
import { getAchievements } from '@/api/achievements';
import { useAuthStore } from '@/stores/authStore';
import type { AchievementSummary } from '@/types/api';

export const achievementsQueryKey = ['achievements'] as const;

export const useAchievements = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<AchievementSummary>({
    queryKey: achievementsQueryKey,
    queryFn: getAchievements,
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });
};
