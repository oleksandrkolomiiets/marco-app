/**
 * `scheduled_at` is a wall-clock time encoded in UTC, not a real instant.
 *
 * CreatePreparationForm builds it with Date.UTC() from the digits the player
 * typed (see combineDateTime), and every formatter reads it back with
 * getUTCHours(). "20:00" means 20:00 on the player's own clock, wherever they
 * are — the same match moved to another timezone keeps the same string.
 *
 * So a scheduled_at can only be compared against Date.now() after being
 * rebuilt as a local Date. Passing the ISO string to `new Date()` and
 * comparing that is wrong by the device's UTC offset: in CEST a 20:00 match
 * stayed "next up" until 22:00, and in New York it would drop off the upcoming
 * list at 16:00, four hours before the player walked on court.
 *
 * `played_at`, by contrast, IS a real instant — the server stamps time.Now()
 * when the sheet sends `played_at: "now"`. Do not pass it through here.
 */
export function wallClock(scheduledAt: string): Date {
  const d = new Date(scheduledAt);
  return new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    0,
    0,
  );
}

/** Milliseconds since the epoch for a wall-clock `scheduled_at`. */
export const wallClockTime = (scheduledAt: string): number =>
  wallClock(scheduledAt).getTime();

/** Has this match's slot passed on the player's own clock? */
export const isPast = (scheduledAt: string, now: number = Date.now()): boolean =>
  wallClockTime(scheduledAt) < now;
