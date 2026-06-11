import type { CreateMatchLogParams, MatchLog, PartnerSuggestion } from '@/types/api';
import { api } from './client';

export function listMatchLogs(): Promise<MatchLog[]> {
  return api.get('/api/v1/logs/match');
}

export function createMatchLog(data: CreateMatchLogParams): Promise<MatchLog> {
  return api.post('/api/v1/logs/match', data);
}

export function updateMatchLog(id: string, data: CreateMatchLogParams): Promise<MatchLog> {
  return api.patch(`/api/v1/logs/match/${id}`, data);
}

export function listMatchPartners(): Promise<PartnerSuggestion[]> {
  return api.get('/api/v1/logs/match/partners');
}
