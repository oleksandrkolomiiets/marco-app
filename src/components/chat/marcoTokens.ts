// Parsers and strippers for the inline tokens Marco emits ([LESSON_REF: …],
// [MATCH_LOG: …], [MATCH_PREP: …]), used by the chat screen (finalization)
// and StreamingBubble (mid-stream display).
//
// The grammar is shared with the Go backend (marco-api internal/marco/) and
// pinned by token_fixtures.json — an IDENTICAL copy lives in both repos and
// both test suites run their implementation against it. Change the grammar
// only by updating prompt.md, the fixtures, and BOTH implementations.

export type LessonRef = { id: string; title: string };

// Mirrors the server-side regex (marco-api internal/marco/lesson_refs.go):
// id is the curriculum slug (letters, digits, _, -), title is wrapped in
// double quotes. Capturing the quoted form lets us strip the quotes cleanly
// instead of carrying them into the rendered card title.
export const LESSON_REF_RE = /\[LESSON_REF:\s*([a-zA-Z0-9_-]+)\s*\|\s*"([^"]+)"\s*\]/g;
export const MATCH_LOG_RE = /\[MATCH_LOG:\s*\{[^}]+\}\s*\]/g;

// Two or more consecutive blank lines — what a stripped token leaves behind
// when Marco wrote it on a line of its own. Mirrors the Go side
// (marco-api internal/marco/lesson_refs.go blankLineRunRegex).
const BLANK_LINE_RUN_RE = /\n[ \t]*\n(?:[ \t]*\n)+/g;

// Without this the bubble renders a hole where the token used to be. Only
// vertical runs collapse: the fixtures pin interior horizontal gaps as-is.
export function collapseBlankLineRuns(text: string): string {
  return text.replace(BLANK_LINE_RUN_RE, '\n\n');
}

export function parseLessonRefs(text: string): { clean: string; refs: LessonRef[] } {
  const refs: LessonRef[] = [];
  const clean = text.replace(LESSON_REF_RE, (_match, id: string, title: string) => {
    refs.push({ id: id.trim(), title: title.trim() });
    return '';
  }).trim();
  return { clean, refs };
}

// parseFinalMessage turns Marco's raw final text into what the chat renders:
// every token removed, lesson refs extracted for the tappable cards. This is
// the client counterpart of the server's marco.CleanContent + ParseLessonRefs.
export function parseFinalMessage(text: string): { clean: string; refs: LessonRef[] } {
  const { clean, refs } = parseLessonRefs(
    stripMatchPrep(text.replace(MATCH_LOG_RE, '')),
  );
  return { clean: collapseBlankLineRuns(clean).trim(), refs };
}

// Streaming-friendly: matches the token even if the closing bracket hasn't
// streamed in yet, so the raw "[LESSON_REF: ..." never flickers.
export const LESSON_REF_STREAMING_RE = /\[LESSON_REF:[\s\S]*?(?:\]|$)/g;
// Strips both completed and in-progress MATCH_LOG tokens from the streaming
// bubble so the raw "[MATCH_LOG: {..." never flickers on screen mid-stream.
export const MATCH_LOG_STREAMING_RE = /\[MATCH_LOG:[\s\S]*?(?:\]|$)/g;

const TOKEN_PREFIXES = ['[LESSON_REF:', '[MATCH_LOG:', '[MATCH_PREP:'];

// Hides an incomplete token keyword at the end of streamed text (e.g.
// "[LESSON_R"). The regexes above only match once the full "[LESSON_REF:"
// has streamed in, so without this the keyword itself is visible raw for the
// few ticks it takes to arrive. A legit "[" in prose is hidden for at most a
// character or two until the next character diverges from every keyword.
function hideTrailingPartialToken(text: string): string {
  const lastBracket = text.lastIndexOf('[');
  if (lastBracket < 0) return text;
  const tail = text.slice(lastBracket);
  if (TOKEN_PREFIXES.some((p) => p.startsWith(tail))) return text.slice(0, lastBracket);
  return text;
}

// One-call cleanup for the streaming bubble: complete and in-progress tokens
// of all three kinds removed, plus any trailing partial keyword.
export function stripStreamingTokens(text: string): string {
  return collapseBlankLineRuns(
    hideTrailingPartialToken(
      stripMatchPrep(
        text.replace(MATCH_LOG_STREAMING_RE, '').replace(LESSON_REF_STREAMING_RE, ''),
      ),
    ),
  );
}

// MATCH_PREP tokens can contain nested braces (drills[] is an array of
// objects), so a flat `\{[^}]+\}` regex won't match them. stripMatchPrep
// scans with a brace counter, mirroring the Go parser. Used both at
// finalization and for mid-stream display.
export function stripMatchPrep(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf('[MATCH_PREP:', i);
    if (start < 0) {
      out += text.slice(i);
      break;
    }
    out += text.slice(i, start);
    const objStart = text.indexOf('{', start);
    if (objStart < 0) {
      // Mid-stream: token opened but JSON hasn't started yet. Drop the
      // partial prefix so it doesn't flicker.
      break;
    }
    let depth = 0;
    let inString = false;
    let escaped = false;
    let objEnd = -1;
    for (let j = objStart; j < text.length; j++) {
      const ch = text[j]!;
      if (inString) {
        if (escaped) { escaped = false; continue; }
        if (ch === '\\') { escaped = true; continue; }
        if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === '{') { depth++; continue; }
      if (ch === '}') {
        depth--;
        if (depth === 0) { objEnd = j; break; }
      }
    }
    if (objEnd < 0) break; // unterminated → drop rest, will resolve on next chunk
    const closeBracket = text.indexOf(']', objEnd);
    if (closeBracket < 0) break;
    i = closeBracket + 1;
  }
  return out;
}
