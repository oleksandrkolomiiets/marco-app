import { api } from '@/api/client';
import type { Lesson, LessonProgress, ProgressStatus } from '@/types/api';

export const getLessons = (level?: string): Promise<Lesson[]> =>
  api.get<Lesson[]>('/api/v1/lessons', level ? { level } : undefined);

export const getLesson = (slug: string): Promise<Lesson> =>
  api.get<Lesson>(`/api/v1/lessons/${slug}`);

export const updateProgress = (
  slug: string,
  status: ProgressStatus,
): Promise<LessonProgress> =>
  api.patch<LessonProgress>(`/api/v1/lessons/${slug}/progress`, { status });
