import { sendMessage, type SendMessageChunk } from '@/api/chat';
import { useAuthStore } from '@/stores/authStore';

// Minimal stand-in for React Native's XMLHttpRequest. Tests feed SSE chunks by
// appending to responseText and firing onprogress, then complete the request
// by firing onload with a status.
class FakeXHR {
  static instances: FakeXHR[] = [];

  method = '';
  url = '';
  requestHeaders: Record<string, string> = {};
  body: string | null = null;
  status = 0;
  responseText = '';

  onprogress: (() => void) | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string): void {
    this.requestHeaders[name] = value;
  }

  send(body: string): void {
    this.body = body;
    FakeXHR.instances.push(this);
  }
}

const flush = (): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

function feed(xhr: FakeXHR, chunk: string): void {
  xhr.responseText += chunk;
  xhr.onprogress?.();
}

function finish(xhr: FakeXHR, status = 200): void {
  xhr.status = status;
  xhr.onload?.();
}

// Kick off sendMessage, let the generator run far enough to create + send the
// XHR, and hand back the captured instance plus the pending first next().
async function start(message: string) {
  const gen = sendMessage(message);
  const first = gen.next();
  await flush();
  const xhr = FakeXHR.instances[0];
  if (!xhr) throw new Error('sendMessage did not create an XMLHttpRequest');
  return { gen, xhr, first };
}

async function collect(
  gen: AsyncGenerator<SendMessageChunk>,
  first: ReturnType<AsyncGenerator<SendMessageChunk>['next']>,
): Promise<SendMessageChunk[]> {
  const chunks: SendMessageChunk[] = [];
  let result = await first;
  while (!result.done) {
    chunks.push(result.value);
    result = await gen.next();
  }
  return chunks;
}

describe('sendMessage', () => {
  beforeEach(() => {
    FakeXHR.instances = [];
    globalThis.XMLHttpRequest = FakeXHR as unknown as typeof XMLHttpRequest;
    useAuthStore.setState({
      accessToken: 'chat-token',
      refreshToken: 'chat-refresh',
      user: null,
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('POSTs the message with auth header and yields streamed text in order', async () => {
    const { gen, xhr, first } = await start('How do I improve my bandeja?');

    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('https://api.test/api/v1/chat');
    expect(xhr.requestHeaders['Content-Type']).toBe('application/json');
    expect(xhr.requestHeaders['Authorization']).toBe('Bearer chat-token');
    expect(xhr.body).toBe(
      JSON.stringify({ message: 'How do I improve my bandeja?' }),
    );

    feed(xhr, 'data: {"text":"Keep your "}\n\n');
    feed(xhr, 'data: {"text":"elbow up."}\n\n');
    finish(xhr);

    await expect(collect(gen, first)).resolves.toEqual([
      'Keep your ',
      'elbow up.',
    ]);
  });

  it('yields a matchLog chunk for an event: match_log frame', async () => {
    const { gen, xhr, first } = await start('I won 6-3 6-4 with Alex');

    feed(
      xhr,
      'event: match_log\ndata: {"result":"won 6-3 6-4","partner_name":"Alex"}\n\n',
    );
    feed(xhr, 'data: {"text":"Nice win!"}\n\n');
    finish(xhr);

    await expect(collect(gen, first)).resolves.toEqual([
      { matchLog: { result: 'won 6-3 6-4', partner_name: 'Alex' } },
      'Nice win!',
    ]);
  });

  it('yields a matchPrep chunk for an event: match_prep frame', async () => {
    const { gen, xhr, first } = await start('Help me prep for Saturday');

    feed(
      xhr,
      'event: match_prep\ndata: {"mode":"create","opponents":["Bo","Cy"]}\n\n',
    );
    finish(xhr);

    await expect(collect(gen, first)).resolves.toEqual([
      { matchPrep: { mode: 'create', opponents: ['Bo', 'Cy'] } },
    ]);
  });

  it('yields the message ids from event: done and then completes', async () => {
    const { gen, xhr, first } = await start('hello');

    feed(xhr, 'data: {"text":"Logged!"}\n\n');
    feed(
      xhr,
      'event: done\ndata: {"user_message_id":"um-1","assistant_message_id":"am-1"}\n\n',
    );
    // No onload needed — the done event ends the stream by itself.

    await expect(collect(gen, first)).resolves.toEqual([
      'Logged!',
      { ids: { userMessageId: 'um-1', assistantMessageId: 'am-1' } },
    ]);
  });

  it('throws the server-sent message on an event: error frame', async () => {
    const { xhr, first } = await start('hello');

    feed(xhr, 'event: error\ndata: {"error":"model overloaded"}\n\n');

    await expect(first).rejects.toThrow('model overloaded');
  });

  it('parses SSE frames split across chunk boundaries', async () => {
    const { gen, xhr, first } = await start('hello');

    // A data frame split mid-JSON…
    feed(xhr, 'data: {"text":"Hal');
    feed(xhr, 'f and half"}\n\n');
    // …and an event frame split across three chunks.
    feed(xhr, 'event: match_');
    feed(xhr, 'log\ndata: {"no');
    feed(xhr, 'te":"prep the lob"}\n\n');
    finish(xhr);

    await expect(collect(gen, first)).resolves.toEqual([
      'Half and half',
      { matchLog: { note: 'prep the lob' } },
    ]);
  });

  it('clears auth and throws a session-expired error on a 401', async () => {
    const { xhr, first } = await start('hello');

    finish(xhr, 401);

    await expect(first).rejects.toThrow(
      'Your session expired — please sign in again.',
    );
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it('throws on a non-2xx, non-401 status', async () => {
    const { xhr, first } = await start('hello');

    finish(xhr, 500);

    await expect(first).rejects.toThrow('Chat request failed: 500');
    // A plain server error must not log the user out.
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
