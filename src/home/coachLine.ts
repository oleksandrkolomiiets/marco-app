import type { Lesson, MatchPreparation } from '@/types/api';

export type CoachLineInput = {
  prep: MatchPreparation | null;
  continueLesson: Lesson | null;
  completedCount: number;
  totalCount: number;
};

/**
 * Marco's line under the greeting on Home.
 *
 * It was the hardcoded "Your bandeja's loose. I queued a 90-sec fix." — shown
 * to everyone on every launch, including a brand-new account with no matches,
 * no lessons and no exam, about a shot Marco had never seen them hit. Nothing
 * was queued either; there is no such queue. Every branch below is read off
 * state the player can go and check.
 *
 * Pure and kept out of the screen so the branches can be tested without
 * mounting Home and its five hooks.
 */
export function getCoachLine({
  prep,
  continueLesson,
  completedCount,
  totalCount,
}: CoachLineInput): string {
  if (prep) {
    // A prep with no drills also has nothing outstanding, so the empty queue
    // has to be answered before the all-done branch — otherwise Marco calls a
    // prep "done" while the card right below him reads "0/0 drills · 0% ready".
    // Same trap the card itself and the notification planner already dodge.
    if (prep.drills.length === 0) {
      return 'No drills queued for your next match — ask me for some.';
    }
    const remaining = prep.drills.filter((d) => !d.completed).length;
    if (remaining > 0) {
      return `${remaining === 1 ? 'One drill' : `${remaining} drills`} left before your next match.`;
    }
    return 'Your prep queue is done. Go play.';
  }
  if (totalCount > 0 && completedCount === totalCount) {
    return 'Every lesson done. Time to put it on court.';
  }
  if (continueLesson) {
    return completedCount === 0
      ? `Start with ${continueLesson.title} — that's where everyone begins.`
      : `Next up: ${continueLesson.title}.`;
  }
  return 'Ready when you are.';
}
