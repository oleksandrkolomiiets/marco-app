import { computePreparationStats } from '@/hooks/usePreparation';
import type { MatchPreparation } from '@/types/api';

const prep = (over: Partial<MatchPreparation> = {}): MatchPreparation => ({
  id: 'prep-1',
  user_id: 'user-1',
  match_log_id: null,
  scheduled_at: '2026-08-01T20:00:00Z',
  played_at: null,
  opponents: [],
  partner_name: null,
  court: null,
  note: null,
  plan_grade: null,
  preparation_pct: 100,
  drills: [],
  created_at: '2026-07-01T10:00:00Z',
  updated_at: '2026-07-01T10:00:00Z',
  ...over,
});

// Fixed so the 30-day window is deterministic. Local time, because
// scheduled_at is wall-clock-in-UTC and gets rebuilt on the player's clock.
const NOW = new Date('2026-08-06T21:00:00').getTime();

describe('computePreparationStats', () => {
  it('averages readiness over the matches in the window', () => {
    const stats = computePreparationStats(
      [
        prep({ id: 'a', scheduled_at: '2026-08-01T20:00:00Z', preparation_pct: 100 }),
        prep({ id: 'b', scheduled_at: '2026-08-02T20:00:00Z', preparation_pct: 50 }),
      ],
      30,
      NOW,
    );
    expect(stats.preps).toBe(2);
    expect(stats.avgPreparation).toBe(75);
  });

  it('drops matches older than the window', () => {
    const stats = computePreparationStats(
      [
        prep({ id: 'old', scheduled_at: '2026-06-01T20:00:00Z' }),
        prep({ id: 'recent', scheduled_at: '2026-08-02T20:00:00Z' }),
      ],
      30,
      NOW,
    );
    expect(stats.preps).toBe(1);
  });

  // The header reads "N PREPS · LAST 30 DAYS" next to "AVG READY". A match
  // that has not been played yet belongs to neither number: it was not in the
  // last 30 days, and its queue is unstarted by definition, so counting it
  // reported a readiness the player had not had the chance to earn.
  describe('matches that have not happened yet', () => {
    it('leaves a future match out of the count', () => {
      const stats = computePreparationStats(
        [
          prep({ id: 'played', scheduled_at: '2026-08-02T20:00:00Z', preparation_pct: 80 }),
          prep({ id: 'future', scheduled_at: '2026-08-11T09:00:00Z', preparation_pct: 0 }),
        ],
        30,
        NOW,
      );
      expect(stats.preps).toBe(1);
    });

    it('does not let a future match drag the average down', () => {
      const played = prep({ id: 'played', scheduled_at: '2026-08-02T20:00:00Z', preparation_pct: 80 });
      const future = prep({ id: 'future', scheduled_at: '2026-08-11T09:00:00Z', preparation_pct: 0 });

      expect(computePreparationStats([played], 30, NOW).avgPreparation).toBe(80);
      expect(computePreparationStats([played, future], 30, NOW).avgPreparation).toBe(80);
    });

    it('reports nothing at all when every match is still ahead', () => {
      const stats = computePreparationStats(
        [prep({ scheduled_at: '2026-08-11T09:00:00Z' })],
        30,
        NOW,
      );
      expect(stats).toEqual({ preps: 0, avgPreparation: 0, planWorked: 0, planGraded: 0 });
    });

    // played_at is a real instant, unlike scheduled_at. A prep played early
    // still counts from the moment it was actually played.
    it('counts a prep marked played ahead of its slot', () => {
      const stats = computePreparationStats(
        [
          prep({
            scheduled_at: '2026-08-11T09:00:00Z',
            played_at: '2026-08-05T18:00:00Z',
            preparation_pct: 60,
          }),
        ],
        30,
        NOW,
      );
      expect(stats.preps).toBe(1);
      expect(stats.avgPreparation).toBe(60);
    });
  });

  describe('plan grades', () => {
    it('counts worked against everything graded', () => {
      const stats = computePreparationStats(
        [
          prep({ id: 'a', scheduled_at: '2026-08-01T20:00:00Z', plan_grade: 'worked' }),
          prep({ id: 'b', scheduled_at: '2026-08-02T20:00:00Z', plan_grade: 'missed' }),
          prep({ id: 'c', scheduled_at: '2026-08-03T20:00:00Z', plan_grade: null }),
        ],
        30,
        NOW,
      );
      expect(stats.planWorked).toBe(1);
      expect(stats.planGraded).toBe(2);
    });

    // "mixed" is a real grade the sheet offers, but it is neither a win nor a
    // loss, so it stays out of both sides of the ratio.
    it('leaves mixed out of the ratio entirely', () => {
      const stats = computePreparationStats(
        [prep({ scheduled_at: '2026-08-01T20:00:00Z', plan_grade: 'mixed' })],
        30,
        NOW,
      );
      expect(stats.planWorked).toBe(0);
      expect(stats.planGraded).toBe(0);
    });
  });

  it('reports an empty window rather than an average over nothing', () => {
    expect(computePreparationStats([], 30, NOW)).toEqual({
      preps: 0,
      avgPreparation: 0,
      planWorked: 0,
      planGraded: 0,
    });
  });
});
