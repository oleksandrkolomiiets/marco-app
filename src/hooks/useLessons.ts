import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getLesson, getLessons, updateProgress } from '@/api/lessons';
import { useAuthStore } from '@/stores/authStore';
import type { Lesson, ProgressStatus } from '@/types/api';

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
      queryClient.setQueryData<Lesson>(lessonQueryKey(slug), (old) =>
        old ? { ...old, progress } : old,
      );
      void queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
};
