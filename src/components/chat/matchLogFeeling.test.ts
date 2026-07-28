import { isRealIsoDate, normalizeFeeling } from '@/components/chat/MatchLogForm';

// The match-log form offers a fixed set of feeling chips. Marco's prompt now
// constrains the [MATCH_LOG: …] token to those exact keys, but the API only caps
// the field's length, so free-form values still arrive from older logs. An
// unmatched value used to leave the step blank, silently dropping an answer the
// user had already given Marco in chat.
describe('normalizeFeeling', () => {
  const cases: { name: string; input: string | null | undefined; want: string | null }[] = [
    { name: 'passes an exact chip key through', input: 'frustrated', want: 'frustrated' },
    { name: 'passes the two-word key through', input: 'on fire', want: 'on fire' },
    { name: 'is case-insensitive', input: 'Good', want: 'good' },
    { name: 'trims surrounding whitespace', input: '  tired  ', want: 'tired' },
    { name: 'handles mixed case and padding together', input: ' On Fire ', want: 'on fire' },
    // "great" is the value the prompt's own example used to emit, and it is
    // already present in existing match_logs rows.
    { name: 'maps great to good', input: 'great', want: 'good' },
    { name: 'maps amazing to good', input: 'amazing', want: 'good' },
    { name: 'maps okay to meh', input: 'okay', want: 'meh' },
    { name: 'maps annoyed to frustrated', input: 'annoyed', want: 'frustrated' },
    { name: 'maps exhausted to tired', input: 'exhausted', want: 'tired' },
    { name: 'maps hyphenated on-fire to the chip key', input: 'on-fire', want: 'on fire' },
    { name: 'returns null for an unmappable word', input: 'pensive', want: null },
    { name: 'returns null for empty string', input: '', want: null },
    { name: 'returns null for null', input: null, want: null },
    { name: 'returns null for undefined', input: undefined, want: null },
  ];

  it.each(cases)('$name', ({ input, want }) => {
    expect(normalizeFeeling(input)).toBe(want);
  });
});

// Step 1 gated on /^\d{4}-\d{2}-\d{2}$/, so an impossible date passed the step
// and only failed on save — surfacing the backend's raw "played_on must be
// YYYY-MM-DD" after the user had filled in all six steps.
describe('isRealIsoDate', () => {
  const cases: { name: string; input: string; want: boolean }[] = [
    { name: 'accepts a real date', input: '2026-07-28', want: true },
    { name: 'accepts a leap day in a leap year', input: '2024-02-29', want: true },
    { name: 'accepts the last day of a 31-day month', input: '2026-01-31', want: true },
    { name: 'rejects month 13', input: '2026-13-01', want: false },
    { name: 'rejects day 45', input: '2026-07-45', want: false },
    { name: 'rejects month 13 and day 45 together', input: '2026-13-45', want: false },
    { name: 'rejects month 00', input: '2026-00-10', want: false },
    { name: 'rejects day 00', input: '2026-07-00', want: false },
    { name: 'rejects 31 April', input: '2026-04-31', want: false },
    { name: 'rejects a leap day in a non-leap year', input: '2026-02-29', want: false },
    { name: 'rejects a single-digit month without padding', input: '2026-7-28', want: false },
    { name: 'rejects a two-digit year', input: '26-07-28', want: false },
    { name: 'rejects a datetime string', input: '2026-07-28T10:00:00Z', want: false },
    { name: 'rejects slashes', input: '2026/07/28', want: false },
    { name: 'rejects empty string', input: '', want: false },
    { name: 'rejects free text', input: 'yesterday', want: false },
  ];

  it.each(cases)('$name', ({ input, want }) => {
    expect(isRealIsoDate(input)).toBe(want);
  });
});
