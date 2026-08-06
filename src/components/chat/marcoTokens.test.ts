import { stripStreamingTokens, stripMatchPrep } from './marcoTokens';

describe('stripStreamingTokens', () => {
  it('leaves plain text untouched', () => {
    expect(stripStreamingTokens('Great bandeja today — keep it up!')).toBe(
      'Great bandeja today — keep it up!',
    );
  });

  it('resolves a complete LESSON_REF token to its title mid-message', () => {
    // Matches what parseFinalMessage will render, so the sentence does not
    // change shape when the stream ends.
    expect(
      stripStreamingTokens('Try [LESSON_REF: bdj_001 | "Bandeja basics"] tonight.'),
    ).toBe('Try Bandeja basics tonight.');
  });

  it('strips a complete MATCH_LOG token', () => {
    expect(
      stripStreamingTokens('Logged! [MATCH_LOG: {"result":"won"}] Nice win.'),
    ).toBe('Logged!  Nice win.');
  });

  it('strips a complete MATCH_PREP token with nested braces', () => {
    const token =
      '[MATCH_PREP: {"mode":"create","drills":[{"title":"Bandeja","duration_seconds":300}]}]';
    expect(stripStreamingTokens(`${token}\nSetting one up.`)).toBe('\nSetting one up.');
  });

  // The reported glitch: while the keyword itself is streaming in
  // ("[LESS", "[LESSON_R", …) nothing matched and the raw text flashed.
  // Every *partial* prefix of every token form must be invisible. The complete
  // token is not a partial: a lesson ref resolves to its title there, the
  // others to nothing — which is what the finalised message renders too.
  it.each([
    ['[LESSON_REF: bdj_001 | "Bandeja basics"]', 'Try this. Bandeja basics'],
    ['[MATCH_LOG: {"result":"won"}]', 'Try this. '],
    ['[MATCH_PREP: {"mode":"adjust","id":"x"}]', 'Try this. '],
  ])('hides every partial streaming prefix of %s', (token, whenComplete) => {
    for (let i = 1; i < token.length; i++) {
      const out = stripStreamingTokens(`Try this. ${token.slice(0, i)}`);
      expect(out).toBe('Try this. ');
    }
    expect(stripStreamingTokens(`Try this. ${token}`)).toBe(whenComplete);
  });

  it('keeps a legit bracket once it diverges from every token keyword', () => {
    // "[Ma" diverges from "[MATCH_…" (case-sensitive) and must reappear.
    expect(stripStreamingTokens('Padel slang [Bajada] is a thing')).toBe(
      'Padel slang [Bajada] is a thing',
    );
    expect(stripStreamingTokens('score was [6-4]')).toBe('score was [6-4]');
  });

  it('hides a lone trailing "[" (could still become any token)', () => {
    expect(stripStreamingTokens('One more thing [')).toBe('One more thing ');
  });

  it('returns empty string while a leading token is still streaming', () => {
    expect(stripStreamingTokens('[MATCH_PREP: {"mode":"crea')).toBe('');
  });
});

describe('stripMatchPrep', () => {
  it('drops an unterminated token to the end of the buffer', () => {
    expect(stripMatchPrep('Plan: [MATCH_PREP: {"mode":"create","opp')).toBe('Plan: ');
  });

  it('keeps text after a terminated token', () => {
    expect(stripMatchPrep('A [MATCH_PREP: {"mode":"adjust","id":"x"}] B')).toBe('A  B');
  });
});
