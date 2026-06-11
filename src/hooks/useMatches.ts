import { useQuery } from '@tanstack/react-query';
import { listMatchLogs } from '@/api/logs';
import { useAuthStore } from '@/stores/authStore';
import type { MatchLog } from '@/types/api';

export const matchesQueryKey = ['matches'] as const;

export const useMatches = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<MatchLog[]>({
    queryKey: matchesQueryKey,
    queryFn: listMatchLogs,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
};

export type MatchStats = {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winRatePercent: number;
};

export const computeMatchStats = (matches: MatchLog[], withinDays?: number): MatchStats => {
  const cutoff =
    withinDays !== undefined
      ? Date.now() - withinDays * 24 * 60 * 60 * 1000
      : null;

  const scoped = cutoff === null
    ? matches
    : matches.filter((m) => new Date(m.played_on).getTime() >= cutoff);

  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const m of scoped) {
    if (m.result === 'won') wins += 1;
    else if (m.result === 'lost') losses += 1;
    else if (m.result === 'draw') draws += 1;
  }
  const decided = wins + losses;
  const winRatePercent = decided > 0 ? Math.round((wins / decided) * 100) : 0;

  return {
    total: scoped.length,
    wins,
    losses,
    draws,
    winRatePercent,
  };
};
