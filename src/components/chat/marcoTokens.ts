// Strippers for the inline tokens Marco emits ([LESSON_REF: …],
// [MATCH_LOG: …], [MATCH_PREP: …]) shared by the chat screen (finalization)
// and StreamingBubble (mid-stream display).

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
  return hideTrailingPartialToken(
    stripMatchPrep(
      text.replace(MATCH_LOG_STREAMING_RE, '').replace(LESSON_REF_STREAMING_RE, ''),
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
