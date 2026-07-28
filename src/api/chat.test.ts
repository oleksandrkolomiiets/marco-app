import {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { api, apiClient } from '@/api/client';
import { sendMessage, type SendMessageChunk } from '@/api/chat';
import { useAuthStore } from '@/stores/authStore';

const ROTATED = {
  access_token: 'new-access',
  refresh_token: 'new-refresh',
  expires_in: 900,
};

const ok = <T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

const httpError = (
  config: InternalAxiosRequestConfig,
  status: number,
  data: object,
): AxiosError => {
  const response: AxiosResponse = {
    data,
    status,
    statusText: `${status}`,
    headers: {},
    config,
  };
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_REQUEST',
    config,
    undefined,
    response,
  );
};

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

// Let the refresh-and-replay chain finish: several promise ticks, plus time for
// any delay the mocked axios adapter introduces.
const settle = async (ms = 0): Promise<void> => {
  for (let i = 0; i < 6; i += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
};

function replayOf(attempt: number): FakeXHR {
  const xhr = FakeXHR.instances[attempt];
  if (!xhr) throw new Error(`sendMessage did not open attempt ${attempt + 1}`);
  return xhr;
}

const refreshCallsOf = (
  adapter: jest.Mock<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>,
): number =>
  adapter.mock.calls.filter(([config]) => config.url === '/auth/refresh').length;

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
  let adapter: jest.Mock<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>;

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
    // The chat stream refreshes through the shared axios client, so stub its
    // transport: by default /auth/refresh hands back a rotated pair.
    adapter = jest.fn(async (config) => ok(config, ROTATED));
    apiClient.defaults.adapter = adapter;
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

  // A 401 here is normally just the 15-minute access token expiring. Because the
  // stream uses XHR it never reaches the axios refresh interceptor, so these
  // cases pin the refresh-and-replay it has to perform itself.
  it('refreshes and replays the stream once on a 401, keeping the session', async () => {
    const { gen, xhr, first } = await start('How do I fix my bandeja?');

    finish(xhr, 401);
    await settle();

    // A second attempt went out with the rotated token and the same message —
    // the regression was that the typed message was lost to a forced sign-out.
    expect(FakeXHR.instances).toHaveLength(2);
    const replay = replayOf(1);
    expect(replay.requestHeaders['Authorization']).toBe('Bearer new-access');
    expect(replay.body).toBe(
      JSON.stringify({ message: 'How do I fix my bandeja?' }),
    );

    feed(replay, 'data: {"text":"Brush down and through."}\n\n');
    finish(replay);

    await expect(collect(gen, first)).resolves.toEqual([
      'Brush down and through.',
    ]);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('new-access');
    expect(state.refreshToken).toBe('new-refresh');
    expect(refreshCallsOf(adapter)).toBe(1);
  });

  it('clears auth and reports session expiry when the refresh itself fails', async () => {
    adapter.mockImplementation(async (config) => {
      throw httpError(config, 401, { error: 'refresh token revoked' });
    });

    const { xhr, first } = await start('hello');

    finish(xhr, 401);

    await expect(first).rejects.toThrow(
      'Your session expired — please sign in again.',
    );
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    // Nothing was replayed — the session is genuinely dead.
    expect(FakeXHR.instances).toHaveLength(1);
  });

  it('clears auth when the replayed stream is rejected again', async () => {
    const { first } = await start('hello');

    finish(replayOf(0), 401);
    await settle();
    finish(replayOf(1), 401);

    await expect(first).rejects.toThrow(
      'Your session expired — please sign in again.',
    );
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    // One refresh, one replay — never an endless refresh/replay loop.
    expect(refreshCallsOf(adapter)).toBe(1);
    expect(FakeXHR.instances).toHaveLength(2);
  });

  it('shares a single refresh with a concurrent axios 401', async () => {
    adapter.mockImplementation(async (config) => {
      if (config.url === '/auth/refresh') {
        // Stay in flight long enough for the chat 401 to join this refresh.
        await new Promise((resolve) => setTimeout(resolve, 20));
        return ok(config, ROTATED);
      }
      if (config.headers.get('Authorization') === 'Bearer new-access') {
        return ok(config, { fine: true });
      }
      throw httpError(config, 401, { error: 'token expired' });
    });

    const { gen, xhr, first } = await start('hello');

    // Park an axios 401 on the shared in-flight refresh…
    const axiosCall = api.get<{ fine: boolean }>('/api/v1/me');
    await flush();
    // …then let the chat stream 401 and join the same one. The server rotates
    // the refresh token on every call, so a second refresh would revoke this one.
    finish(xhr, 401);
    await settle(10);

    await expect(axiosCall).resolves.toEqual({ fine: true });
    expect(refreshCallsOf(adapter)).toBe(1);

    const replay = replayOf(1);
    expect(replay.requestHeaders['Authorization']).toBe('Bearer new-access');
    feed(replay, 'data: {"text":"still here"}\n\n');
    finish(replay);

    await expect(collect(gen, first)).resolves.toEqual(['still here']);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('throws on a non-2xx, non-401 status', async () => {
    const { xhr, first } = await start('hello');

    finish(xhr, 500);

    await expect(first).rejects.toThrow('Chat request failed: 500');
    // A plain server error must not log the user out.
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
