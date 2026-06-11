import { api } from '@/api/client';
import type {
  ExamAttemptReview,
  ExamQuestion,
  SubmitExamAttemptParams,
} from '@/types/api';

export const getExamQuestions = (): Promise<ExamQuestion[]> =>
  api.get<ExamQuestion[]>('/api/v1/exam/questions');

export const submitExamAttempt = (
  params: SubmitExamAttemptParams,
): Promise<ExamAttemptReview> =>
  api.post<ExamAttemptReview>('/api/v1/exam/attempts', params);

export const getLatestExamAttempt = (): Promise<ExamAttemptReview> =>
  api.get<ExamAttemptReview>('/api/v1/exam/attempts/latest');
