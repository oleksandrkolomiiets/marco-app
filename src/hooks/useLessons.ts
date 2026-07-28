import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getLesson, getLessons, updateProgress } from '@/api/lessons';
import { useAuthStore } from '@/stores/authStore';
import type { Lesson, ProgressStatus } from '@/types/api';

/**
 * A lesson counts as completed only once it is learned or mastered — merely
 * viewing it does not. Shared so the home tile, the journey header and the
 * journey map cannot drift apart: they all render "X of 35" for the same idea,
 * and the home tile used to count any lesson with a progress row.
 */
export const isLessonCompleted = (lesson: Lesson): boolean =>
  lesson.progress === 'learned' || lesson.progress === 'mastered';

export const lessonsQueryKey = (level?: string) =>
  level ? (['lessons', level] as const) : (['lessons'] as const);

export const lessonQueryKey = (slug: string) => ['lesson', slug] as const;

export const useLessons = (level?: string) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<Lesson[]>({
    queryKey: lessonsQueryKey(level),
    queryFn: () => getLessons(level),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });
};

export const useLesson = (slug: string) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<Lesson>({
    queryKey: lessonQueryKey(slug),
    queryFn: () => getLesson(slug),
    enabled: isAuthenticated && !!slug,
    staleTime: 2 * 60 * 1000,
  });
};

export const useUpdateProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, status }: { slug: string; status: ProgressStatus }) =>
      updateProgress(slug, status),
    onSuccess: (progress, { slug }) => {
      // PATCH returns the full LessonProgress, but a cached Lesson carries just
      // the status string — writing the object here made the mark-as selection
      // look right until the next real fetch replaced it with a string.
      queryClient.setQueryData<Lesson>(lessonQueryKey(slug), (old) =>
        old ? { ...old, progress: progress.status } : old,
      );
      void queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
};
