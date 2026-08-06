import { getCoachLine } from '@/home/coachLine';
import type { Lesson, MatchPreparation, PreparationDrill } from '@/types/api';

const drill = (completed: boolean, i: number): PreparationDrill => ({
  id: `drill-${i}`,
  position: i,
  title: `Drill ${i}`,
  duration_seconds: 600,
  completed,
  created_at: '2026-08-01T10:00:00Z',
});

const prep = (drills: PreparationDrill[]): MatchPreparation => ({
  id: 'prep-1',
  user_id: 'user-1',
  match_log_id: null,
  scheduled_at: '2026-08-10T20:00:00Z',
  played_at: null,
  opponents: [],
  partner_name: null,
  court: null,
  note: null,
  plan_grade: null,
  preparation_pct: 0,
  drills,
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-01T10:00:00Z',
});

const lesson = (title: string): Lesson =>
  ({ id: 'lesson-1', slug: 'the-ready-position', title }) as Lesson;

const NO_PREP = { prep: null, continueLesson: null, completedCount: 0, totalCount: 0 };

describe('getCoachLine', () => {
  describe('with a match coming up', () => {
    it('counts the drills still outstanding', () => {
      const line = getCoachLine({
        ...NO_PREP,
        prep: prep([drill(true, 1), drill(false, 2), drill(false, 3)]),
      });
      expect(line).toBe('2 drills left before your next match.');
    });

    it('uses the singular for one', () => {
      const line = getCoachLine({
        ...NO_PREP,
        prep: prep([drill(true, 1), drill(false, 2)]),
      });
      expect(line).toBe('One drill left before your next match.');
    });

    it('calls a finished queue done', () => {
      const line = getCoachLine({ ...NO_PREP, prep: prep([drill(true, 1)]) });
      expect(line).toBe('Your prep queue is done. Go play.');
    });

    // Marco announced "Your prep queue is done. Go play." above a card reading
    // "0/0 drills · 0% ready" — nothing had been queued at all. Zero remaining
    // out of zero is not the same state as zero remaining out of four.
    it('does not call an empty queue done', () => {
      const line = getCoachLine({ ...NO_PREP, prep: prep([]) });
      expect(line).not.toContain('done');
      expect(line).toBe('No drills queued for your next match — ask me for some.');
    });
  });

  describe('with no match coming up', () => {
    it('points at the first lesson for a fresh account', () => {
      const line = getCoachLine({
        ...NO_PREP,
        continueLesson: lesson('The Ready Position'),
        totalCount: 35,
      });
      expect(line).toBe(
        "Start with The Ready Position — that's where everyone begins.",
      );
    });

    it('points at the next lesson once something is done', () => {
      const line = getCoachLine({
        ...NO_PREP,
        continueLesson: lesson('The Continental Grip'),
        completedCount: 1,
        totalCount: 35,
      });
      expect(line).toBe('Next up: The Continental Grip.');
    });

    it('celebrates a finished curriculum', () => {
      const line = getCoachLine({
        ...NO_PREP,
        continueLesson: lesson('The Continental Grip'),
        completedCount: 35,
        totalCount: 35,
      });
      expect(line).toBe('Every lesson done. Time to put it on court.');
    });

    // The lessons request can fail or still be in flight. Marco says something
    // true and empty rather than inventing a drill, which is what the old
    // hardcoded line did.
    it('says nothing specific when it knows nothing', () => {
      expect(getCoachLine(NO_PREP)).toBe('Ready when you are.');
    });
  });
});
