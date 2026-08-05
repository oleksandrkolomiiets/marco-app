import { combineDateTime } from '@/components/preparation/CreatePreparationForm';

// scheduled_at is wall-clock-in-UTC across the app: Marco emits the player's
// stated time as a UTC timestamp and every formatter reads it back with getUTC*.
// This helper used the local-time Date constructor, so a time typed in CEST was
// stored two hours earlier and displayed that way — and it leaned on Date's
// overflow normalisation, turning impossible dates into different valid ones.
describe('combineDateTime', () => {
  it('preserves the entered wall clock rather than shifting by the UTC offset', () => {
    expect(combineDateTime('2026-08-08', '20:00')).toBe('2026-08-08T20:00:00.000Z');
  });

  it('keeps the date stable just after midnight', () => {
    // With the local-time constructor this rolled back to the previous day.
    expect(combineDateTime('2026-08-08', '00:30')).toBe('2026-08-08T00:30:00.000Z');
  });

  it('keeps the date stable late at night', () => {
    expect(combineDateTime('2026-08-08', '23:45')).toBe('2026-08-08T23:45:00.000Z');
  });

  it('accepts a leap day in a leap year', () => {
    expect(combineDateTime('2024-02-29', '10:00')).toBe('2024-02-29T10:00:00.000Z');
  });

  const rejected: { name: string; date: string; time: string }[] = [
    { name: 'month 13', date: '2026-13-01', time: '20:00' },
    { name: 'month 00', date: '2026-00-10', time: '20:00' },
    { name: 'day 45', date: '2026-08-45', time: '20:00' },
    { name: 'day 00', date: '2026-08-00', time: '20:00' },
    { name: '31 April', date: '2026-04-31', time: '20:00' },
    { name: '29 February in a common year', date: '2026-02-29', time: '20:00' },
    { name: 'hour 24', date: '2026-08-08', time: '24:00' },
    { name: 'hour 99', date: '2026-08-08', time: '99:00' },
    { name: 'minute 60', date: '2026-08-08', time: '20:60' },
    { name: 'unpadded month', date: '2026-8-08', time: '20:00' },
    { name: 'unpadded hour', date: '2026-08-08', time: '9:00' },
    { name: 'empty date', date: '', time: '20:00' },
    { name: 'empty time', date: '2026-08-08', time: '' },
    { name: 'free text date', date: 'saturday', time: '20:00' },
  ];

  it.each(rejected)('rejects $name', ({ date, time }) => {
    expect(combineDateTime(date, time)).toBeNull();
  });
});
