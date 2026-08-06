import type { MatchLog } from '@/types/api';

const WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// played_on is read with getUTC* everywhere else in the app, same as
// scheduled_at. Keep it that way so the draft quotes the date the row shows.
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const wd = WEEKDAY_LONG[d.getUTCDay()] ?? '';
  const day = d.getUTCDate();
  const mo = MONTH_LONG[d.getUTCMonth()] ?? '';
  return `${wd} ${day} ${mo}`;
};

const RESULT_PHRASE: Record<string, string> = {
  won: 'I won',
  lost: 'I lost',
  draw: 'we drew',
};

const joinNames = (names: string[]): string =>
  names.length === 1
    ? (names[0] as string)
    : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;

/**
 * The opening message for "Ask Marco about this" on a match log.
 *
 * The button used to just push the chat tab, dropping the match on the floor:
 * it promised a conversation about *this* match and delivered an empty
 * composer. Marco's server-side context already carries recent logs, so the
 * draft only has to say which match is meant — date, whoever was on court, and
 * the result — and leave the question open.
 *
 * It opens with "the match I logged" deliberately. Phrased as a plain result
 * report ("I won my match on Thursday") Marco reads it as a new match being
 * told to him and answers with a "Log this match" button, offering to record a
 * second copy of the one you are standing on.
 *
 * Returned as a draft rather than sent, so the player can reword it, and so
 * tapping the button never spends a reply they didn't ask for.
 */
export function askMarcoDraft(match: MatchLog): string {
  let opening = `Looking back at the match I logged on ${formatDate(match.played_on)}`;

  if (match.opponents.length > 0) {
    opening += ` against ${joinNames(match.opponents)}`;
  }
  if (match.partner_name) {
    opening += `, playing with ${match.partner_name}`;
  }

  const result = match.result !== null ? RESULT_PHRASE[match.result] : undefined;
  if (result) {
    opening += ` — ${result}`;
  }

  return `${opening}. What should I work on?`;
}
