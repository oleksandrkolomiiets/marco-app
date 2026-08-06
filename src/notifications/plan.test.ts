import { buildPlan } from '@/notifications/plan';
import { DEFAULT_PREFS } from '@/stores/notificationStore';
import type { MatchPreparation, PreparationDrill } from '@/types/api';

const BOTH_ON = { matchReminders: true, weeklyNudge: true };
const REMINDERS_OFF = { matchReminders: false, weeklyNudge: true };

const drill = (completed: boolean, i: number): PreparationDrill => ({
  id: `drill-${i}`,
  position: i,
  title: `Drill ${i}`,
  duration_seconds: 600,
  completed,
  created_at: '2026-08-01T10:00:00Z',
});

const prep = (over: Partial<MatchPreparation> = {}): MatchPreparation => ({
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
  drills: [],
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-01T10:00:00Z',
  ...over,
});

// A Monday, well clear of the fixtures below.
const NOW = new Date('2026-08-03T09:00:00');

describe('buildPlan', () => {
  it('schedules the evening before and two hours ahead', () => {
    const plans = buildPlan(BOTH_ON, [prep()], NOW);

    expect(plans).toHaveLength(2);
    // 18:00 the day before the 10 Aug 20:00 match.
    expect(plans[0]?.at).toEqual(new Date('2026-08-09T18:00:00'));
    expect(plans[1]?.at).toEqual(new Date('2026-08-10T18:00:00'));
  });

  it('returns the alerts in the order they will fire', () => {
    const plans = buildPlan(
      BOTH_ON,
      [
        prep({ id: 'later', scheduled_at: '2026-08-20T20:00:00Z' }),
        prep({ id: 'sooner', scheduled_at: '2026-08-06T09:00:00Z' }),
      ],
      NOW,
    );

    const times = plans.map((p) => p.at.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  // Scheduling a date in the past makes iOS fire it immediately, so booking a
  // match late at night for tomorrow morning must not set off the
  // evening-before alarm the moment you save it.
  it('skips the evening-before slot when it has already passed', () => {
    const bookedLateAtNight = new Date('2026-08-03T22:30:00');
    const tomorrowMorning = prep({ scheduled_at: '2026-08-04T09:00:00Z' });
    const plans = buildPlan(BOTH_ON, [tomorrowMorning], bookedLateAtNight);

    // 18:00 on the 3rd is behind us; 07:00 on the 4th is not.
    expect(plans).toHaveLength(1);
    expect(plans[0]?.at).toEqual(new Date('2026-08-04T07:00:00'));
    for (const plan of plans) {
      expect(plan.at.getTime()).toBeGreaterThan(bookedLateAtNight.getTime());
    }
  });

  // The mirror of the case above: booked in the morning for tomorrow, the
  // 18:00 slot is still ahead and should be used.
  it('keeps the evening-before slot when it is still ahead', () => {
    const tomorrowMorning = prep({ scheduled_at: '2026-08-04T09:00:00Z' });
    const plans = buildPlan(BOTH_ON, [tomorrowMorning], NOW);

    expect(plans.map((p) => p.at)).toEqual([
      new Date('2026-08-03T18:00:00'),
      new Date('2026-08-04T07:00:00'),
    ]);
  });

  it('skips both slots for a match starting within the hour', () => {
    const imminent = prep({ scheduled_at: '2026-08-03T09:30:00Z' });
    expect(buildPlan(BOTH_ON, [imminent], NOW)).toEqual([]);
  });

  it('ignores matches already in the past', () => {
    const done = prep({ scheduled_at: '2026-07-01T20:00:00Z' });
    expect(buildPlan(BOTH_ON, [done], NOW)).toEqual([]);
  });

  // A prep marked played is history, even if its slot is somehow in the future.
  it('ignores preps that have been played', () => {
    const played = prep({ played_at: '2026-08-02T21:30:00Z' });
    expect(buildPlan(BOTH_ON, [played], NOW)).toEqual([]);
  });

  it('schedules nothing when match reminders are off', () => {
    expect(buildPlan(REMINDERS_OFF, [prep()], NOW)).toEqual([]);
  });

  // iOS silently drops pending notifications past 64, so the plan stays small
  // rather than quietly losing the ones at the end.
  it('caps how many matches it schedules for', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      prep({ id: `prep-${i}`, scheduled_at: `2026-09-${String(i + 1).padStart(2, '0')}T20:00:00Z`}),
    );
    const plans = buildPlan(BOTH_ON, many, NOW);
    expect(plans).toHaveLength(10); // 5 matches × 2 alerts
  });

  describe('what the alert says', () => {
    it('counts the drills still outstanding', () => {
      const plans = buildPlan(
        BOTH_ON,
        [prep({ drills: [drill(true, 1), drill(false, 2), drill(false, 3)] })],
        NOW,
      );
      expect(plans[0]?.body).toBe('2 drills left in your queue.');
    });

    it('uses the singular for one', () => {
      const plans = buildPlan(
        BOTH_ON,
        [prep({ drills: [drill(true, 1), drill(false, 2)] })],
        NOW,
      );
      expect(plans[0]?.body).toBe('One drill left in your queue.');
    });

    // An empty queue and a finished queue both have zero remaining, and they
    // are not the same thing — the prep card makes the same distinction.
    it('tells an empty queue apart from a finished one', () => {
      const empty = buildPlan(BOTH_ON, [prep({ drills: [] })], NOW);
      expect(empty[0]?.body).toBe('No drills queued yet — ask Marco for some.');

      const done = buildPlan(BOTH_ON, [prep({ drills: [drill(true, 1)] })], NOW);
      expect(done[0]?.body).toBe('Queue complete. Go play.');
    });

    it('names the opponents when there are any', () => {
      const plans = buildPlan(
        BOTH_ON,
        [prep({ opponents: ['Lucia', 'Pablo'] })],
        NOW,
      );
      expect(plans[0]?.title).toBe('Match tomorrow at 20:00 vs Lucia & Pablo');
      expect(plans[1]?.title).toBe('Match at 20:00 vs Lucia & Pablo');
    });

    // No "vs" with nobody on the other side of it, same rule as the prep list.
    it('leaves the vs off when nobody is named', () => {
      const plans = buildPlan(BOTH_ON, [prep({ opponents: [] })], NOW);
      expect(plans[0]?.title).toBe('Match tomorrow at 20:00');
      expect(plans[0]?.title).not.toContain('vs');
    });
  });

  // scheduled_at is a wall-clock time encoded in UTC — CreatePreparationForm
  // writes it with Date.UTC() and every screen reads it with getUTCHours().
  // Treating it as a real instant put every alarm out by the device's UTC
  // offset and made the notification quote a time no other screen showed.
  describe('the wall-clock convention', () => {
    it('quotes the same time the prep card does, whatever the offset', () => {
      const plans = buildPlan(BOTH_ON, [prep({ scheduled_at: '2026-08-10T20:00:00Z' })], NOW);
      expect(plans[0]?.title).toContain('20:00');
      expect(plans[1]?.title).toContain('20:00');
    });

    it('fires two hours before the time on the player’s own clock', () => {
      const plans = buildPlan(BOTH_ON, [prep({ scheduled_at: '2026-08-10T20:00:00Z' })], NOW);
      const twoHoursBefore = plans[1];
      // Local 18:00, not 18:00 UTC — the same reading the title gives minus two.
      expect(twoHoursBefore?.at.getHours()).toBe(18);
      expect(twoHoursBefore?.at.getDate()).toBe(10);
    });

    it('puts the evening-before alert at 18:00 local the previous day', () => {
      const plans = buildPlan(BOTH_ON, [prep({ scheduled_at: '2026-08-10T09:00:00Z' })], NOW);
      const eveningBefore = plans[0];
      expect(eveningBefore?.at.getHours()).toBe(18);
      expect(eveningBefore?.at.getDate()).toBe(9);
    });
  });

  it('defaults to match reminders on and the weekly nudge off', () => {
    expect(DEFAULT_PREFS).toEqual({ matchReminders: true, weeklyNudge: false });
  });
});
