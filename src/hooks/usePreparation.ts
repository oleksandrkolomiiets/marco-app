import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMatchPreparation,
  deleteMatchPreparation,
  listMatchPreparation,
  replaceMatchPreparationDrills,
  suggestPreparationDrills,
  togglePreparationDrill,
  updateMatchPreparation,
} from '@/api/preparation';
import { useAuthStore } from '@/stores/authStore';
import type {
  CreateMatchPreparationParams,
  DrillInput,
  MatchPreparation,
  UpdateMatchPreparationParams,
} from '@/types/api';

export const preparationQueryKey = ['match-preparation'] as const;

export const useMatchPreparation = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<MatchPreparation[]>({
    queryKey: preparationQueryKey,
    queryFn: listMatchPreparation,
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
};

export const useCreateMatchPreparation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMatchPreparationParams) => createMatchPreparation(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: preparationQueryKey }),
  });
};

export const useUpdateMatchPreparation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMatchPreparationParams }) =>
      updateMatchPreparation(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: preparationQueryKey }),
  });
};

export const useDeleteMatchPreparation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMatchPreparation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: preparationQueryKey }),
  });
};

export const useReplaceDrills = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, drills }: { id: string; drills: DrillInput[] }) =>
      replaceMatchPreparationDrills(id, drills),
    onSuccess: () => qc.invalidateQueries({ queryKey: preparationQueryKey }),
  });
};

export const useTogglePreparationDrill = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      preparationId,
      drillId,
      completed,
    }: {
      preparationId: string;
      drillId: string;
      completed: boolean;
    }) => togglePreparationDrill(preparationId, drillId, completed),
    onSuccess: () => qc.invalidateQueries({ queryKey: preparationQueryKey }),
  });
};

export const useSuggestPreparationDrills = () => {
  return useMutation({
    mutationFn: (id: string) => suggestPreparationDrills(id),
  });
};

export type PreparationStats = {
  preps: number;
  avgPreparation: number;
  planWorked: number;
  planGraded: number;
};

export const computePreparationStats = (
  items: MatchPreparation[],
  withinDays = 30,
): PreparationStats => {
  const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;
  const recent = items.filter((r) => new Date(r.scheduled_at).getTime() >= cutoff);
  if (recent.length === 0) {
    return { preps: 0, avgPreparation: 0, planWorked: 0, planGraded: 0 };
  }
  const sum = recent.reduce((acc, r) => acc + r.preparation_pct, 0);
  let worked = 0;
  let graded = 0;
  for (const r of recent) {
    if (r.plan_grade === 'worked') {
      worked += 1;
      graded += 1;
    } else if (r.plan_grade === 'missed') {
      graded += 1;
    }
  }
  return {
    preps: recent.length,
    avgPreparation: Math.round(sum / recent.length),
    planWorked: worked,
    planGraded: graded,
  };
};

/**
 * How to head a prep: who it's against, or a neutral label when nobody was
 * named. Three places used to decide this on their own and disagreed — the
 * list row called an opponent-less prep "vs Match prep", the sheet that opens
 * from that very row called it "vs Upcoming match", and both kept the "vs"
 * with nobody on the other side of it.
 */
export const preparationHeadline = (
  opponents: string[],
): { vs: boolean; title: string } =>
  opponents.length > 0
    ? { vs: true, title: opponents.join(' & ') }
    : { vs: false, title: 'Match prep' };
