import { preparationHeadline } from '@/hooks/usePreparation';
import { wallClock } from '@/time/wallClock';
import type { MatchPreparation } from '@/types/api';
import type { NotificationPrefs } from '@/stores/notificationStore';

// iOS keeps at most 64 pending local notifications per app and silently drops
// the rest, so the schedule is deliberately small: the next few matches, two
// alerts each, plus one weekly nudge.
const MAX_PREPS_SCHEDULED = 5;

const HOUR = 60 * 60 * 1000;

/** Alert the evening before a match, at 18:00 local time. */
const EVENING_BEFORE_HOUR = 18;
/** And again shortly before it starts. */
const HOURS_BEFORE_MATCH = 2;

export type ScheduledPlan = {
  /** When to fire, and what to say. Sorted earliest first. */
  at: Date;
  title: string;
  body: string;
};

const timeOfDay = (iso: string): string => {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const opponentSuffix = (prep: MatchPreparation): string => {
  const headline = preparationHeadline(prep.opponents);
  return headline.vs ? ` vs ${headline.title}` : '';
};

// What's left to do, phrased the way the prep card phrases it. An empty queue
// and a finished queue are different states and must not both read "ready".
const queueLine = (prep: MatchPreparation): string => {
  const remaining = prep.drills.filter((d) => !d.completed).length;
  if (prep.drills.length === 0) return 'No drills queued yet — ask Marco for some.';
  if (remaining === 0) return 'Queue complete. Go play.';
  return remaining === 1
    ? 'One drill left in your queue.'
    : `${remaining} drills left in your queue.`;
};

/**
 * Work out every alert that should be pending, given the preferences and the
 * preps the app knows about. Pure, so the timing rules are testable without
 * touching the notification system.
 *
 * `now` is passed in rather than read from the clock so a plan can be computed
 * for a fixed instant in tests.
 */
export function buildPlan(
  prefs: NotificationPrefs,
  preps: MatchPreparation[],
  now: Date,
): ScheduledPlan[] {
  const plans: ScheduledPlan[] = [];

  if (prefs.matchReminders) {
    const upcoming = preps
      .filter((p) => p.played_at === null)
      .filter((p) => wallClock(p.scheduled_at).getTime() > now.getTime())
      .sort(
        (a, b) =>
          wallClock(a.scheduled_at).getTime() - wallClock(b.scheduled_at).getTime(),
      )
      .slice(0, MAX_PREPS_SCHEDULED);

    for (const prep of upcoming) {
      const kickoff = wallClock(prep.scheduled_at);

      const eveningBefore = new Date(kickoff);
      eveningBefore.setDate(eveningBefore.getDate() - 1);
      eveningBefore.setHours(EVENING_BEFORE_HOUR, 0, 0, 0);
      // A match booked for tomorrow morning, or booked after 18:00 today, has
      // already missed its evening-before slot. Skipping beats firing
      // immediately, which is what scheduling a past date would do.
      if (eveningBefore.getTime() > now.getTime()) {
        plans.push({
          at: eveningBefore,
          title: `Match tomorrow at ${timeOfDay(prep.scheduled_at)}${opponentSuffix(prep)}`,
          body: queueLine(prep),
        });
      }

      const shortlyBefore = new Date(kickoff.getTime() - HOURS_BEFORE_MATCH * HOUR);
      if (shortlyBefore.getTime() > now.getTime()) {
        plans.push({
          at: shortlyBefore,
          title: `Match at ${timeOfDay(prep.scheduled_at)}${opponentSuffix(prep)}`,
          body: queueLine(prep),
        });
      }
    }
  }

  return plans.sort((a, b) => a.at.getTime() - b.at.getTime());
}
