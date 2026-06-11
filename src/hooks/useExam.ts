import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getExamQuestions,
  getLatestExamAttempt,
  submitExamAttempt,
} from '@/api/exam';
import { useAuthStore } from '@/stores/authStore';
import type {
  ExamAttemptReview,
  ExamQuestion,
  SubmitExamAttemptParams,
} from '@/types/api';

export const examQuestionsQueryKey = ['exam', 'questions'] as const;
export const latestExamAttemptQueryKey = ['exam', 'attempts', 'latest'] as const;

export const useExamQuestions = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<ExamQuestion[]>({
    queryKey: examQuestionsQueryKey,
    queryFn: getExamQuestions,
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });
};

export const useLatestExamAttempt = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<ExamAttemptReview | null>({
    queryKey: latestExamAttemptQueryKey,
    queryFn: async () => {
      try {
        return await getLatestExamAttempt();
      } catch (err) {
        // 404 = user hasn't taken the exam yet. Treat as "no attempt" rather
        // than an error so the home tile can read it cleanly.
        if (err instanceof Error && /no attempt yet|404/i.test(err.message)) {
          return null;
        }
        throw err;
      }
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
};

export const useSubmitExamAttempt = () => {
  const queryClient = useQueryClient();

  return useMutation<ExamAttemptReview, Error, SubmitExamAttemptParams>({
    mutationFn: submitExamAttempt,
    onSuccess: (review) => {
      queryClient.setQueryData<ExamAttemptReview>(
        latestExamAttemptQueryKey,
        review,
      );
    },
  });
};
