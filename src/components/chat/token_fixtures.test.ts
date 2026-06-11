import fixtures from './token_fixtures.json';
import { parseFinalMessage, stripStreamingTokens } from './marcoTokens';

// token_fixtures.json is the shared contract for Marco's inline token
// grammar. An IDENTICAL copy lives in the marco-api repo
// (internal/marco/testdata/token_fixtures.json), where the Go parsers run
// against the same cases. If a change here makes this test disagree with the
// fixtures, update the grammar in marco-api's prompt.md, the fixtures, and
// BOTH repos' implementations together.

const KEYWORDS = ['[LESSON_REF', '[MATCH_LOG', '[MATCH_PREP'];

describe('token grammar fixtures (shared with marco-api)', () => {
  it('has cases', () => {
    expect(fixtures.cases.length).toBeGreaterThan(0);
  });

  describe.each(fixtures.cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    it('finalizes to the expected clean text and lesson refs', () => {
      const { clean, refs } = parseFinalMessage(c.input);
      expect(clean).toBe(c.clean_text);
      expect(refs).toEqual(c.lesson_refs);
    });

    // The streaming guarantee: no matter where the SSE chunk boundary falls,
    // the visible streamed text never contains a token keyword — not even
    // while the keyword itself is still arriving character by character.
    it('never reveals a token keyword at any streaming prefix', () => {
      for (let i = 1; i <= c.input.length; i++) {
        const visible = stripStreamingTokens(c.input.slice(0, i));
        for (const keyword of KEYWORDS) {
          expect(visible).not.toContain(keyword);
        }
      }
    });
  });
});
