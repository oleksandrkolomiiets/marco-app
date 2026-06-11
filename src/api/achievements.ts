import { api } from '@/api/client';
import type { AchievementSummary } from '@/types/api';

export const getAchievements = (): Promise<AchievementSummary> =>
  api.get<AchievementSummary>('/api/v1/achievements');
