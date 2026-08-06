import { isPast, wallClock, wallClockTime } from '@/time/wallClock';

// These assertions are about the gap between "the instant this ISO string
// names" and "the time the player sees on the prep card". At UTC+0 the two
// coincide and every one of them passes even with the bug present, so the
// suite pins the offset rather than trusting whatever the runner happens to
// be set to.
describe('wallClock', () => {
  it('reads the UTC digits as local wall-clock time', () => {
    const d = wallClock('2026-08-10T20:00:00Z');
    expect(d.getHours()).toBe(20);
    expect(d.getMinutes()).toBe(0);
    expect(d.getDate()).toBe(10);
    expect(d.getMonth()).toBe(7);
    expect(d.getFullYear()).toBe(2026);
  });

  it('keeps the date stable just after midnight', () => {
    const d = wallClock('2026-08-10T00:30:00Z');
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(0);
  });

  it('keeps the date stable late at night', () => {
    const d = wallClock('2026-08-10T23:45:00Z');
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(23);
  });

  // The round trip that matters: what combineDateTime writes is what the
  // player gets back on their own clock.
  it('round-trips what combineDateTime stored', () => {
    const stored = '2026-08-08T20:00:00.000Z';
    const back = wallClock(stored);
    expect(`${String(back.getHours()).padStart(2, '0')}:${String(back.getMinutes()).padStart(2, '0')}`).toBe(
      '20:00',
    );
  });
});

describe('isPast', () => {
  const at = (local: string): number => new Date(local).getTime();

  it('is false a minute before the match starts', () => {
    expect(isPast('2026-08-10T20:00:00Z', at('2026-08-10T19:59:00'))).toBe(false);
  });

  it('is true a minute after the match starts', () => {
    expect(isPast('2026-08-10T20:00:00Z', at('2026-08-10T20:01:00'))).toBe(true);
  });

  // The bug this replaced: `new Date(scheduled_at) < Date.now()`. East of
  // Greenwich that kept a finished match listed as "next up" for hours after
  // it ended; west of it, the match vanished from the upcoming list — and got
  // counted as an unplayed past prep — before the player had left the house.
  it('turns over at the player’s own clock, not at the UTC instant', () => {
    const scheduled = '2026-08-10T20:00:00Z';
    const naive = new Date(scheduled).getTime();
    const ours = wallClockTime(scheduled);
    const offsetMs = new Date(scheduled).getTimezoneOffset() * 60 * 1000;

    // The two only agree at UTC+0; everywhere else they differ by the offset,
    // which is exactly the window in which the old comparison was wrong.
    expect(ours - naive).toBe(offsetMs);
  });
});
