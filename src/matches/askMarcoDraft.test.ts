import { askMarcoDraft } from '@/matches/askMarcoDraft';
import type { MatchLog } from '@/types/api';

const match = (over: Partial<MatchLog> = {}): MatchLog =>
  ({
    id: 'match-1',
    user_id: 'user-1',
    played: true,
    result: 'won',
    feeling: null,
    note: null,
    partner_name: null,
    opponents: [],
    played_on: '2026-08-06T00:00:00Z',
    created_at: '2026-08-06T21:00:00Z',
    ...over,
  }) as MatchLog;

// The button reads "Ask Marco about this" but only pushed the chat tab, so
// Marco was handed an empty composer and no idea which match was meant.
describe('askMarcoDraft', () => {
  it('names the date and the result', () => {
    expect(askMarcoDraft(match())).toBe(
      'Looking back at the match I logged on Thursday 6 August — I won. What should I work on?',
    );
  });

  it('handles a loss', () => {
    expect(askMarcoDraft(match({ result: 'lost' }))).toContain('— I lost');
  });

  it('handles a draw', () => {
    expect(askMarcoDraft(match({ result: 'draw' }))).toContain('— we drew');
  });

  // The API allows a log with no result on old rows, even though the form now
  // requires one. The draft still has to name a match.
  it('still says which match when there is no result', () => {
    expect(askMarcoDraft(match({ result: null }))).toBe(
      'Looking back at the match I logged on Thursday 6 August. What should I work on?',
    );
  });

  it('names the opponents', () => {
    expect(askMarcoDraft(match({ opponents: ['Lucia', 'Pablo'] }))).toContain(
      'against Lucia & Pablo',
    );
  });

  it('names a single opponent without an ampersand', () => {
    const draft = askMarcoDraft(match({ opponents: ['Lucia'] }));
    expect(draft).toContain('against Lucia');
    expect(draft).not.toContain('&');
  });

  it('names the partner', () => {
    expect(askMarcoDraft(match({ partner_name: 'Sofia' }))).toContain(
      'playing with Sofia',
    );
  });

  it('puts everyone on court into one sentence', () => {
    expect(
      askMarcoDraft(match({ opponents: ['Lucia', 'Pablo'], partner_name: 'Sofia' })),
    ).toBe(
      'Looking back at the match I logged on Thursday 6 August against Lucia & Pablo, playing with Sofia — I won. What should I work on?',
    );
  });

  // Phrased as a plain result report, Marco read the draft as a new match
  // being told to him and answered with a "Log this match" button — offering
  // to record a duplicate of the match the player had open. Saying the match
  // is already logged is what keeps the reply a review rather than an intake.
  it('frames the match as already logged, not as a fresh result', () => {
    const draft = askMarcoDraft(match());
    expect(draft).toContain('the match I logged');
    expect(draft.startsWith('I won')).toBe(false);
  });

  // played_on is read with getUTC* on every other screen, so a match logged
  // for the 6th must not be quoted as the 5th to someone west of Greenwich.
  it('quotes the date the match row shows', () => {
    expect(askMarcoDraft(match({ played_on: '2026-08-06T00:00:00Z' }))).toContain(
      'Thursday 6 August',
    );
  });

  it('always ends with an open question', () => {
    expect(askMarcoDraft(match())).toMatch(/What should I work on\?$/);
  });
});
