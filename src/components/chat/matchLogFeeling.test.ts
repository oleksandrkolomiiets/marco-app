import { normalizeFeeling } from '@/components/chat/MatchLogForm';

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
