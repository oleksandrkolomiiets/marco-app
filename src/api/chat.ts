import type { ChatMessage, MatchLogPrefill, MatchPrepPrefill } from '@/types/api';
import { useAuthStore } from '@/stores/authStore';
import { api } from './client';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export type SendMessageIDs = { userMessageId: string; assistantMessageId: string };
export type SendMessageChunk =
  | string
  | { matchLog: MatchLogPrefill }
  | { matchPrep: MatchPrepPrefill }
  | { ids: SendMessageIDs };

// React Native's fetch does not expose response.body as a ReadableStream, so
// we use XMLHttpRequest with onprogress to consume the SSE stream incrementally.
export async function* sendMessage(message: string): AsyncGenerator<SendMessageChunk> {
  const token = useAuthStore.getState().accessToken;

  type QueueItem =
    | { text: string }
    | { matchLog: MatchLogPrefill }
    | { matchPrep: MatchPrepPrefill }
    | { ids: SendMessageIDs }
    | { error: string }
    | { done: true };
  const queue: QueueItem[] = [];
  let wake: (() => void) | null = null;
  let finished = false;

  const push = (item: QueueItem) => {
    queue.push(item);
    const w = wake;
    wake = null;
    w?.();
  };

  const pushDone = () => {
    if (!finished) {
      finished = true;
      push({ done: true });
    }
  };

  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${API_URL}/api/v1/chat`);
  xhr.setRequestHeader('Content-Type', 'application/json');
  if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

  let processed = 0;
  let buffer = '';
  let currentEvent = '';

  const processChunk = () => {
    if (finished) return;
    const newText = xhr.responseText.slice(processed);
    processed = xhr.responseText.length;
    buffer += newText;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        const raw = line.slice(6).trim();
        if (currentEvent === 'done') {
          // The done payload carries real DB UUIDs for the user+assistant
          // messages so the screen can swap its temporary IDs (used for the
          // optimistic bubbles) for ones the feedback/delete endpoints accept.
          try {
            const parsed = JSON.parse(raw) as { user_message_id?: string; assistant_message_id?: string };
            if (parsed.user_message_id && parsed.assistant_message_id) {
              push({ ids: { userMessageId: parsed.user_message_id, assistantMessageId: parsed.assistant_message_id } });
            }
          } catch {
            // legacy/empty done payload — no IDs to forward
          }
          pushDone();
          return;
        }
        if (currentEvent === 'error') {
          finished = true;
          push({ error: (JSON.parse(raw) as { error: string }).error });
          return;
        }
        if (currentEvent === 'match_log') {
          push({ matchLog: JSON.parse(raw) as MatchLogPrefill });
          currentEvent = '';
          continue;
        }
        if (currentEvent === 'match_prep') {
          push({ matchPrep: JSON.parse(raw) as MatchPrepPrefill });
          currentEvent = '';
          continue;
        }
        // Default chunk: a streamed text fragment. If the server adds a new
        // SSE event the client doesn't know about, this branch would push
        // `{ text: undefined }` and crash the consumer's `in`-operator check —
        // guard against that by ignoring unrecognised events instead.
        if (currentEvent === '') {
          const text = (JSON.parse(raw) as { text?: string }).text;
          if (typeof text === 'string') {
            push({ text });
          }
        }
        currentEvent = '';
      }
    }
  };

  xhr.onprogress = processChunk;
  xhr.onload = () => {
    if (xhr.status < 200 || xhr.status >= 300) {
      finished = true;
      // XHR bypasses the axios 401-refresh interceptor, so handle auth death
      // here: clear the session and let the root layout redirect to welcome.
      if (xhr.status === 401) {
        useAuthStore.getState().clearAuth();
        push({ error: 'Your session expired — please sign in again.' });
        return;
      }
      push({ error: `Chat request failed: ${xhr.status}` });
      return;
    }
    processChunk();
    pushDone();
  };
  xhr.onerror = () => { finished = true; push({ error: 'Network error' }); };
  xhr.ontimeout = () => { finished = true; push({ error: 'Request timed out' }); };

  xhr.send(JSON.stringify({ message }));

  while (true) {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      if ('done' in item) return;
      if ('error' in item) throw new Error(item.error);
      if ('matchLog' in item) { yield item; continue; }
      if ('matchPrep' in item) { yield item; continue; }
      if ('ids' in item) { yield item; continue; }
      yield item.text;
    }
    if (finished) break;
    await new Promise<void>((r) => { wake = r; });
  }
}

export function patchFeedback(messageId: string, score: 1 | -1): Promise<void> {
  return api.patch(`/api/v1/chat/${messageId}/feedback`, { score });
}

export function deleteMessage(messageId: string): Promise<void> {
  return api.delete(`/api/v1/chat/${messageId}`);
}

export type GetMessagesParams = {
  limit?: number;
  before?: string;
};

export type GetMessagesResponse = {
  messages: ChatMessage[];
  has_more: boolean;
};

export async function getMessages(params: GetMessagesParams = {}): Promise<GetMessagesResponse> {
  const query: string[] = [];
  if (params.limit !== undefined) query.push(`limit=${params.limit}`);
  if (params.before) query.push(`before=${encodeURIComponent(params.before)}`);
  const path = `/api/v1/chat/messages${query.length > 0 ? `?${query.join('&')}` : ''}`;
  return api.get<GetMessagesResponse>(path);
}
