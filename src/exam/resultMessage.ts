export type ExamResultMessage = {
  /** Marco's exclamation above the score. */
  headline: string;
  /** The line under it. */
  subLine: string;
};

/**
 * Passing is 18 of 20, so at most two wrong. A few over that is a near miss
 * worth calling one; fourteen wrong is not.
 */
const NEAR_MISS_WRONG = 4;

/**
 * What Marco says over an exam result.
 *
 * Both lines used to be fixed: every failure read "Close. Review the wrong
 * ones and retake." under a celebratory "¡Vamos!", so 6/20 — and 0/20 — were
 * told they had come close to 18. It is a small thing to get wrong and an easy
 * one to notice, and a coach who says you nearly passed when you did not is
 * not worth much on the things you cannot check.
 */
export function examResultMessage(
  passed: boolean,
  wrongCount: number,
): ExamResultMessage {
  if (passed) {
    return { headline: '¡Vamos!', subLine: 'You passed. Rookie license unlocked.' };
  }
  if (wrongCount <= NEAR_MISS_WRONG) {
    return { headline: '¡Casi!', subLine: 'So close. Review the wrong ones and retake.' };
  }
  return {
    headline: '¡Ánimo!',
    subLine: 'Not there yet. Work through the wrong ones and retake.',
  };
}
