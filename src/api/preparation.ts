import type {
  CreateMatchPreparationParams,
  DrillInput,
  MatchPreparation,
  PreparationDrill,
  UpdateMatchPreparationParams,
} from '@/types/api';
import { api, apiClient } from './client';

export function listMatchPreparation(): Promise<MatchPreparation[]> {
  return api.get('/api/v1/match-preparation');
}

export function getMatchPreparation(id: string): Promise<MatchPreparation> {
  return api.get(`/api/v1/match-preparation/${id}`);
}

export function createMatchPreparation(
  data: CreateMatchPreparationParams,
): Promise<MatchPreparation> {
  return api.post('/api/v1/match-preparation', data);
}

export function updateMatchPreparation(
  id: string,
  data: UpdateMatchPreparationParams,
): Promise<MatchPreparation> {
  return api.patch(`/api/v1/match-preparation/${id}`, data);
}

export function deleteMatchPreparation(id: string): Promise<void> {
  return api.delete(`/api/v1/match-preparation/${id}`);
}

// PUT replaces the entire queue. The server preserves a drill's `completed`
// flag when it can match a new entry to an existing one by (title, duration),
// so reorder/add/remove in the sheet doesn't lose the player's checks.
export function replaceMatchPreparationDrills(
  id: string,
  drills: DrillInput[],
): Promise<MatchPreparation> {
  return apiClient.put(
    `/api/v1/match-preparation/${id}/drills`,
    { drills },
  ) as unknown as Promise<MatchPreparation>;
}

export function togglePreparationDrill(
  preparationId: string,
  drillId: string,
  completed: boolean,
): Promise<PreparationDrill> {
  return api.patch(
    `/api/v1/match-preparation/${preparationId}/drills/${drillId}`,
    { completed },
  );
}

// The only endpoint on this screen that waits on Claude rather than Postgres.
// It answered in 16s on a cold local server while the client's 10s default had
// already aborted, so the work was done and thrown away and the sheet showed
// "timeout of 10000ms exceeded" under OR PICK FROM MARCO.
const SUGGEST_DRILLS_TIMEOUT_MS = 45000;

export function suggestPreparationDrills(id: string): Promise<DrillInput[]> {
  return api.post(
    `/api/v1/match-preparation/${id}/suggest-drills`,
    undefined,
    { timeout: SUGGEST_DRILLS_TIMEOUT_MS },
  );
}
