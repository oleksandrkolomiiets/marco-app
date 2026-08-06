import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  type ListRenderItem,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { deleteMessage, getMessages, patchFeedback, sendMessage } from '@/api/chat';
import { ChatInput } from '@/components/chat/ChatInput';
import { MatchLogForm } from '@/components/chat/MatchLogForm';
import { MessageActionSheet } from '@/components/chat/MessageActionSheet';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { parseFinalMessage, type LessonRef } from '@/components/chat/marcoTokens';
import { StreamingBubble } from '@/components/chat/StreamingBubble';
import { LockedBottomSheet } from '@/components/lessons/LockedBottomSheet';
import { PreparationSheet } from '@/components/preparation/PreparationSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import { matchesQueryKey, useMatches } from '@/hooks/useMatches';
import {
  preparationQueryKey,
  useCreateMatchPreparation,
  useMatchPreparation,
  useReplaceDrills,
  useUpdateMatchPreparation,
} from '@/hooks/usePreparation';
import type {
  ChatMessage,
  CreateMatchPreparationParams,
  MatchLog,
  MatchLogPrefill,
  MatchPreparation,
  MatchPrepPrefill,
} from '@/types/api';

// Page background is the design's standard off-white (M.bg), not a bespoke tone.
const BG = '#FAF8F5';
const PAGE_SIZE = 30;

type LocalMessage = ChatMessage & {
  isStreaming?: boolean;
  lessonRefs?: LessonRef[];
  feedbackScore?: 1 | -1;
};

// The opener shown above an empty conversation. Asking a player who has never
// logged a match what "felt off" in their last one is the first thing a new
// account sees, so the greeting picks a line the user can actually answer.
const seedMessage = (hasLoggedMatch: boolean): LocalMessage => ({
  id: 'seed-1',
  role: 'assistant',
  content: hasLoggedMatch
    ? "Ciao! I'm Marco. Tell me about your last match — what felt off?"
    : "Ciao! I'm Marco, your coach. Ask me anything about your game — or tell me about a match and I'll log it for you.",
  created_at: new Date(0).toISOString(),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Backend message IDs are UUIDs; the local seed bubble and any optimistic
// bubbles created before the SSE `done` event use string sentinels. Feedback,
// retry, and hide all hit the backend with the ID — skip the call for non-UUID
// IDs so we don't issue requests that would 400.
function isPersistedMessageId(id: string): boolean {
  return UUID_RE.test(id);
}


function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function dateSeparatorLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDay.getTime() === today.getTime()) {
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    return `Today · ${hh}:${mm}`;
  }
  if (msgDay.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function toLocalMessage(m: ChatMessage): LocalMessage {
  return {
    ...m,
    lessonRefs: m.lesson_refs && m.lesson_refs.length > 0 ? m.lesson_refs : undefined,
  };
}

export default function ChatScreen() {
  const router = useRouter();
  // "Ask Marco about this" on a match log arrives here with the question
  // already written, so the chat opens on that match instead of an empty box.
  const { draft } = useLocalSearchParams<{ draft?: string }>();
  const queryClient = useQueryClient();
  // messages is stored in DESC order (newest first) so it maps 1:1 onto an
  // inverted FlatList's `data` prop — data[0] renders visually at the bottom.
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [matchLogPrefill, setMatchLogPrefill] = useState<MatchLogPrefill | undefined>();
  // Assistant message whose "Log this match" tag triggered the form. Sent on
  // save so the backend can link the match_log → message and the chat UI can
  // show "Logged" persistently.
  const [matchLogMessageId, setMatchLogMessageId] = useState<string | undefined>();
  const [feedbackState, setFeedbackState] = useState<Record<string, 1 | -1>>({});
  const [selectedMessage, setSelectedMessage] = useState<LocalMessage | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  // Messages logged this session via the tag — augments match_logged from the
  // backend so freshly-saved tags flip to "Logged" without waiting for a refetch.
  const [loggedMessageIds, setLoggedMessageIds] = useState<Set<string>>(new Set());
  // Prep id currently open in the sliding sheet, or null when no sheet is showing.
  const [openPrepId, setOpenPrepId] = useState<string | null>(null);
  // Maps an assistant message id to the prep id we already created from its
  // create-mode token, so a second tap re-opens that prep instead of creating
  // a duplicate. The mapping is session-local; on reload the message arrives
  // hydrated with the original prefill and the user can re-create if they
  // really want — but the typical flow is a single tap.
  const [createdPrepByMessageId, setCreatedPrepByMessageId] = useState<Record<string, string>>({});
  // Adjust-mode tags append drills, which is not idempotent — remember which
  // messages have already been applied so a second tap doesn't double them up.
  const [appliedAdjustMessageIds, setAppliedAdjustMessageIds] = useState<Set<string>>(new Set());
  const [lockedSheetOpen, setLockedSheetOpen] = useState(false);
  const { data: preparationList = [] } = useMatchPreparation();
  const { data: matchLogs = [] } = useMatches();
  const hasLoggedMatch = matchLogs.length > 0;
  const createPreparation = useCreateMatchPreparation();
  const updatePreparation = useUpdateMatchPreparation();
  const replaceDrills = useReplaceDrills();
  const accumulatedRef = useRef('');
  // Cursor for upward pagination — the created_at of the oldest message we hold.
  const oldestCursorRef = useRef<string | null>(null);

  const loadInitialHistory = useCallback(() => {
    setHistoryError(false);
    getMessages({ limit: PAGE_SIZE }).then((res) => {
      const asc = res.messages.map(toLocalMessage);
      // API returns ASC; flip to DESC for the inverted list.
      const desc = [...asc].reverse();
      setMessages(desc);
      setHasMore(res.has_more);
      oldestCursorRef.current = asc.length > 0 ? (asc[0]?.created_at ?? null) : null;
      const seeded: Record<string, 1 | -1> = {};
      const prepLinks: Record<string, string> = {};
      for (const m of asc) {
        if (m.feedback_score === 1 || m.feedback_score === -1) {
          seeded[m.id] = m.feedback_score;
        }
        // Server-side back-reference: any assistant message that has already
        // spawned a prep arrives with match_preparation_id set. Seed the
        // session map so the tag renders as "Prep ready" without an extra
        // round trip.
        if (m.match_preparation_id) {
          prepLinks[m.id] = m.match_preparation_id;
        }
      }
      if (Object.keys(seeded).length > 0) {
        setFeedbackState((prev) => ({ ...prev, ...seeded }));
      }
      if (Object.keys(prepLinks).length > 0) {
        setCreatedPrepByMessageId((prev) => ({ ...prev, ...prepLinks }));
      }
    }).catch(() => {
      // Surface the failure with a retry — an empty chat with no explanation
      // reads like data loss. The seed message still renders underneath.
      setHistoryError(true);
    }).finally(() => {
      setInitialLoadDone(true);
    });
  }, []);

  useEffect(() => {
    loadInitialHistory();
  }, [loadInitialHistory]);

  const handleLoadOlder = useCallback(async () => {
    if (!hasMore || isLoadingOlder) return;
    const cursor = oldestCursorRef.current;
    if (!cursor) return;
    setIsLoadingOlder(true);
    try {
      const res = await getMessages({ limit: PAGE_SIZE, before: cursor });
      if (res.messages.length === 0) {
        setHasMore(false);
        return;
      }
      const asc = res.messages.map(toLocalMessage);
      const desc = [...asc].reverse();
      // Append to the "older" tail of the DESC array.
      setMessages((prev) => [...prev, ...desc]);
      oldestCursorRef.current = asc[0]?.created_at ?? cursor;
      setHasMore(res.has_more);
      const seeded: Record<string, 1 | -1> = {};
      const prepLinks: Record<string, string> = {};
      for (const m of asc) {
        if (m.feedback_score === 1 || m.feedback_score === -1) {
          seeded[m.id] = m.feedback_score;
        }
        // Server-side back-reference: any assistant message that has already
        // spawned a prep arrives with match_preparation_id set. Seed the
        // session map so the tag renders as "Prep ready" without an extra
        // round trip.
        if (m.match_preparation_id) {
          prepLinks[m.id] = m.match_preparation_id;
        }
      }
      if (Object.keys(seeded).length > 0) {
        setFeedbackState((prev) => ({ ...prev, ...seeded }));
      }
      if (Object.keys(prepLinks).length > 0) {
        setCreatedPrepByMessageId((prev) => ({ ...prev, ...prepLinks }));
      }
    } catch {
      // surface via ErrorBanner once that component lands
    } finally {
      setIsLoadingOlder(false);
    }
  }, [hasMore, isLoadingOlder]);

  const handleSend = useCallback(async (text: string) => {
    const tempUserId = `${Date.now()}-u`;
    const userMsg: LocalMessage = {
      id: tempUserId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [userMsg, ...prev]);
    accumulatedRef.current = '';
    setIsStreaming(true);

    let accumulated = '';
    let realIds: { userMessageId: string; assistantMessageId: string } | null = null;
    let streamedMatchLog: MatchLogPrefill | undefined;
    let streamedMatchPrep: MatchPrepPrefill | undefined;
    try {
      for await (const chunk of sendMessage(text)) {
        if (typeof chunk !== 'string') {
          if ('matchLog' in chunk) {
            // Stash on the assistant message instead of auto-opening — the user
            // taps the "Log this match" tag when they're ready.
            streamedMatchLog = chunk.matchLog;
            continue;
          }
          if ('matchPrep' in chunk) {
            // Same pattern as matchLog: stash for the action tag, don't auto-open.
            streamedMatchPrep = chunk.matchPrep;
            continue;
          }
          if ('ids' in chunk) {
            realIds = chunk.ids;
            continue;
          }
        } else {
          accumulated += chunk;
          accumulatedRef.current = accumulated;
        }
      }
    } catch (err) {
      setIsStreaming(false);
      const errorMsg: LocalMessage = {
        id: `${Date.now()}-err`,
        role: 'assistant',
        content: `Something went wrong: ${err instanceof Error ? err.message : 'please try again'}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [errorMsg, ...prev]);
      return;
    }

    const { clean, refs } = parseFinalMessage(accumulated);
    const assistantId = realIds?.assistantMessageId ?? `${Date.now()}-a`;
    const assistantMsg: LocalMessage = {
      id: assistantId,
      role: 'assistant',
      content: clean,
      created_at: new Date().toISOString(),
      lessonRefs: refs.length > 0 ? refs : undefined,
      match_log_prefill: streamedMatchLog,
      match_prep_prefill: streamedMatchPrep,
    };
    setMessages((prev) => {
      // Swap the temp user-message ID for the real DB UUID so retry/hide can
      // soft-delete it on the backend without a refetch.
      const next = realIds
        ? prev.map((m) => (m.id === tempUserId ? { ...m, id: realIds!.userMessageId } : m))
        : prev;
      return [assistantMsg, ...next];
    });
    setIsStreaming(false);
  }, []);

  const handleFeedback = useCallback(async (messageId: string, score: 1 | -1) => {
    setFeedbackState((prev) => ({ ...prev, [messageId]: score }));
    if (!isPersistedMessageId(messageId)) return;
    try {
      await patchFeedback(messageId, score);
    } catch {
      // optimistic update stays — not critical
    }
  }, []);

  const handleRetry = useCallback((messageId: string) => {
    let textToResend: string | null = null;
    let userMsgIdToDelete: string | null = null;
    let assistantMsgIdToDelete: string | null = null;
    setMessages((prev) => {
      // prev is DESC (newest first). Find the assistant message, then its
      // chronologically-prior user message — which is the NEXT one in DESC.
      const idx = prev.findIndex((m) => m.id === messageId);
      if (idx === -1) return prev;
      let userIdx = -1;
      for (let i = idx + 1; i < prev.length; i++) {
        if (prev[i]?.role === 'user') { userIdx = i; break; }
      }
      if (userIdx === -1) return prev;
      const userMsg = prev[userIdx]!;
      const assistantMsg = prev[idx]!;
      textToResend = userMsg.content;
      userMsgIdToDelete = userMsg.id;
      assistantMsgIdToDelete = assistantMsg.id;
      // Drop the retried turn (assistant + user) plus anything newer that the
      // resend would replace anyway — same effect as the original prev.slice(0, userIdx).
      return prev.slice(userIdx + 1);
    });
    if (textToResend === null) return;
    if (userMsgIdToDelete && isPersistedMessageId(userMsgIdToDelete)) {
      deleteMessage(userMsgIdToDelete).catch(() => {});
    }
    if (assistantMsgIdToDelete && isPersistedMessageId(assistantMsgIdToDelete)) {
      deleteMessage(assistantMsgIdToDelete).catch(() => {});
    }
    setTimeout(() => handleSend(textToResend!), 0);
  }, [handleSend]);

  const handleHide = useCallback(async (messageId: string) => {
    setHiddenIds((prev) => new Set([...prev, messageId]));
    if (!isPersistedMessageId(messageId)) return;
    try {
      await deleteMessage(messageId);
    } catch {
      // optimistic hide stays — the message is gone from this session even if
      // the backend rejected (e.g. already deleted).
    }
  }, []);

  const handleLogMatchPress = useCallback((messageId: string, prefill: MatchLogPrefill) => {
    setMatchLogPrefill(prefill);
    setMatchLogMessageId(messageId);
    setShowMatchForm(true);
  }, []);

  // Lesson card tap → lessons/[slug] route. Slug comes from the LESSON_REF
  // token id (Marco emits curriculum slugs verbatim from available_lessons[]).
  const handleLessonPress = useCallback((ref: LessonRef) => {
    router.push(`/lessons/${ref.id}` as never);
  }, [router]);

  // Locked (premium) lessons can't be opened. Surface the same upgrade
  // sheet the journey screen uses for locked nodes — matches the
  // "Premium lesson" card pattern users already know from /lessons.
  const handleLockedLessonPress = useCallback((_ref: LessonRef) => {
    setLockedSheetOpen(true);
  }, []);

  const handleMatchSaved = useCallback((log: MatchLog) => {
    if (matchLogMessageId) {
      setLoggedMessageIds((prev) => new Set([...prev, matchLogMessageId]));
    }
    const partnerPart = log.partner_name ? ` vs ${log.partner_name}` : '';
    const resultPart = log.result ? ` ${log.result.charAt(0).toUpperCase() + log.result.slice(1)}` : '';
    const confirmMsg: LocalMessage = {
      id: `${Date.now()}-confirm`,
      role: 'assistant',
      content: `Logged.${resultPart}${partnerPart} — I'll factor that in. What felt off?`,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [confirmMsg, ...prev]);
    void queryClient.invalidateQueries({ queryKey: matchesQueryKey });
  }, [queryClient, matchLogMessageId]);

  // Opens the prep sliding sheet from a chat tag.
  //   adjust → look up the prep referenced by prefill.id and open it. If the
  //            preparation list hasn't loaded yet (e.g. user opened chat first),
  //            wait for it via the cache invalidation that the openPrepId effect
  //            triggers below.
  //   create → call the create mutation with the prefill (Marco's reply has
  //            already promised "the prep is set up"), then open the resulting
  //            prep. Cache the id by message so a second tap doesn't duplicate.
  const handlePrepPress = useCallback((messageId: string, prefill: MatchPrepPrefill) => {
    if (prefill.mode === 'adjust') {
      if (!prefill.id) return;
      const prepId = prefill.id;

      // The token's note/drills are contractual in adjust mode too — prompt.md
      // requires the sheet to open with the drill "already pre-added to the
      // queue". Opening without applying them left the user looking at an
      // unchanged prep right after Marco said it had been updated.
      const target = preparationList.find((r) => r.id === prepId);
      const inlineDrills = prefill.drills ?? [];
      const alreadyApplied = appliedAdjustMessageIds.has(messageId);
      // Every write is gated on having the cached row: drills because PUT
      // replaces the whole queue and we'd clobber it, the note because a prep
      // missing from the list may simply have been deleted — writing then just
      // buys a 404. The effect below decides whether it's gone or still loading.
      const canApply = target !== undefined && (prefill.note || inlineDrills.length > 0);
      if (alreadyApplied || !canApply) {
        setOpenPrepId(prepId);
        return;
      }

      setAppliedAdjustMessageIds((prev) => new Set([...prev, messageId]));
      // The sheet snapshots its prep on mount and deliberately won't resync for
      // the same id (that would clobber in-progress edits), so land the writes
      // and refresh the cache BEFORE opening it — otherwise it mounts on the
      // pre-adjust state and the change looks lost.
      void (async () => {
        try {
          await Promise.all([
            ...(prefill.note
              ? [updatePreparation.mutateAsync({ id: prepId, data: { note: prefill.note } })]
              : []),
            ...(inlineDrills.length > 0 && target
              ? [replaceDrills.mutateAsync({
                  id: prepId,
                  // PUT replaces the whole queue, so carry existing rows (and
                  // their done flags) across rather than dropping them.
                  drills: [
                    ...target.drills.map((d) => ({
                      title: d.title,
                      duration_seconds: d.duration_seconds,
                      completed: d.completed,
                    })),
                    ...inlineDrills,
                  ],
                })]
              : []),
          ]);
          await queryClient.invalidateQueries({ queryKey: preparationQueryKey });
        } catch {
          // Fall through and still open the sheet — the user can adjust by hand
          // rather than being left with a tag that does nothing.
        } finally {
          setOpenPrepId(prepId);
        }
      })();
      return;
    }
    // create mode — re-open the already-created prep if we have one for this
    // message; otherwise call the API once.
    const existing = createdPrepByMessageId[messageId];
    if (existing) {
      setOpenPrepId(existing);
      return;
    }
    const params: CreateMatchPreparationParams = {
      scheduled_at: prefill.scheduled_at ?? new Date().toISOString(),
      ...(prefill.opponents ? { opponents: prefill.opponents } : {}),
      ...(prefill.partner_name ? { partner_name: prefill.partner_name } : {}),
      ...(prefill.court ? { court: prefill.court } : {}),
      ...(prefill.note ? { note: prefill.note } : {}),
      ...(prefill.drills ? { drills: prefill.drills } : {}),
      // Only send a real DB UUID — temp client-generated ids (e.g. `${ts}-a`)
      // would fail server-side parse. The assistant message id arrives on the
      // SSE `done` event, and history-loaded messages already have UUIDs.
      ...(isPersistedMessageId(messageId) ? { message_id: messageId } : {}),
    };
    createPreparation.mutate(params, {
      onSuccess: (r) => {
        setCreatedPrepByMessageId((prev) => ({ ...prev, [messageId]: r.id }));
        setOpenPrepId(r.id);
      },
      onError: () => {
        // Same surface as a failed send: an assistant-style bubble. A silent
        // failure here makes the "Prep ready" tag look broken.
        setMessages((prev) => [{
          id: `${Date.now()}-err`,
          role: 'assistant',
          content: "Couldn't create that match prep — give the tag another tap in a moment.",
          created_at: new Date().toISOString(),
        }, ...prev]);
      },
    });
  }, [
    createPreparation,
    createdPrepByMessageId,
    appliedAdjustMessageIds,
    preparationList,
    updatePreparation,
    replaceDrills,
    queryClient,
  ]);

  // PreparationSheet wants the full MatchPreparation object. Pull it from the
  // cached list once the id is set. Drills inlined from a chat token may take
  // a tick to land in cache after the create — invalidation handles that.
  const openPrep: MatchPreparation | null = useMemo(
    () => (openPrepId ? preparationList.find((r) => r.id === openPrepId) ?? null : null),
    [openPrepId, preparationList],
  );

  // If we set openPrepId before the list has refreshed (typical right after
  // create), pull the list once so the sheet body has a row to render. If the
  // prep is still missing after that refresh it has been deleted, and the tag
  // would otherwise sit there doing nothing every time it is tapped — so give
  // up and say so rather than failing silently.
  const prepLookupRef = useRef<string | null>(null);
  useEffect(() => {
    if (!openPrepId || openPrep) {
      prepLookupRef.current = null;
      return;
    }
    if (prepLookupRef.current === openPrepId) return;
    prepLookupRef.current = openPrepId;
    const missingId = openPrepId;
    void (async () => {
      await queryClient.invalidateQueries({ queryKey: preparationQueryKey });
      // Read the refreshed cache directly — the list in scope here is stale.
      const fresh = queryClient.getQueryData<MatchPreparation[]>(preparationQueryKey);
      if (fresh && !fresh.some((r) => r.id === missingId)) {
        setOpenPrepId(null);
        setMessages((prev) => [{
          id: `${Date.now()}-gone`,
          role: 'assistant',
          content: "That match prep isn't around any more — it looks like it was deleted.",
          created_at: new Date().toISOString(),
        }, ...prev]);
      }
    })();
  }, [openPrepId, openPrep, queryClient]);

  const visibleMessages = useMemo(
    () => messages.filter((m) => !hiddenIds.has(m.id)),
    [messages, hiddenIds],
  );

  const renderItem = useCallback<ListRenderItem<LocalMessage>>(({ item, index }) => {
    // In DESC order, the chronological predecessor (older message) is at index + 1.
    const olderNeighbor: LocalMessage | null = visibleMessages[index + 1] ?? null;
    const showSeparator =
      olderNeighbor !== null && !isSameDay(item.created_at, olderNeighbor.created_at);
    const showAvatar =
      item.role === 'assistant' && (!olderNeighbor || olderNeighbor.role === 'user');
    const matchLogged = item.match_logged === true || loggedMessageIds.has(item.id);
    const prepCreated = createdPrepByMessageId[item.id] !== undefined;
    return (
      <View>
        {showSeparator && (
          <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <Text style={{ fontSize: 12, color: '#9CA3AF', letterSpacing: 0.3 }}>
              {dateSeparatorLabel(item.created_at)}
            </Text>
          </View>
        )}
        <MessageBubble
          message={item}
          showAvatar={showAvatar}
          onLongPress={!isStreaming ? () => setSelectedMessage(item) : undefined}
          onLogMatchPress={(prefill) => handleLogMatchPress(item.id, prefill)}
          matchLogged={matchLogged}
          onPrepPress={(prefill) => handlePrepPress(item.id, prefill)}
          prepCreated={prepCreated}
          lessonRefs={item.lessonRefs}
          onLessonPress={handleLessonPress}
          onLockedLessonPress={handleLockedLessonPress}
        />
      </View>
    );
  }, [visibleMessages, isStreaming, loggedMessageIds, handleLogMatchPress, handlePrepPress, createdPrepByMessageId, handleLessonPress, handleLockedLessonPress]);

  // ListHeaderComponent renders below data[0] in an inverted list — i.e. at
  // the visual bottom — so the in-progress assistant bubble sits beneath the
  // user's just-sent message, matching the standard chat layout.
  // StreamingBubble owns the typewriter interval and its own text state, so
  // the 16ms ticks re-render only the bubble, not this screen or the FlatList.
  const listHeader = isStreaming ? <StreamingBubble source={accumulatedRef} /> : null;

  // ListFooterComponent renders above data[last] in an inverted list — at the
  // visual top — used for the upward-pagination spinner and (once the root of
  // the conversation is reached) the welcome bubble.
  const renderListFooter = useCallback(() => {
    return (
      <View>
        {isLoadingOlder && (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <ActivityIndicator color="#0F4C5C" />
          </View>
        )}
        {initialLoadDone && !hasMore && (
          <MessageBubble message={seedMessage(hasLoggedMatch)} showAvatar />
        )}
      </View>
    );
  }, [isLoadingOlder, hasMore, initialLoadDone, hasLoggedMatch]);

  const keyExtractor = useCallback((item: LocalMessage) => item.id, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: BG,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(0,0,0,0.06)',
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ padding: 4 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={{ fontSize: 20, color: '#0F4C5C' }}>←</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MarcoAvatar size={32} />
            <View>
              <Text style={{ fontWeight: '700', fontSize: 16, color: '#0B1416' }}>Marco</Text>
              {isStreaming ? (
                <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '600', letterSpacing: 0.5 }}>
                  TYPING…
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                  <Text style={{ fontSize: 11, color: '#6B7280', letterSpacing: 0.3 }}>ONLINE</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        {/* The "⋯" that used to sit here had no onPress and no menu behind it,
            while announcing itself to screen readers as "Conversation options".
            Every action Marco's chat actually has is on the per-message
            long-press sheet; bring the affordance back when there is something
            conversation-level to put in it. */}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {historyError && (
          <ErrorBanner
            message="Couldn't load your conversation."
            onRetry={loadInitialHistory}
            onDismiss={() => setHistoryError(false)}
          />
        )}
        <FlatList
          inverted
          data={visibleMessages}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListFooterComponent={renderListFooter}
          onEndReached={handleLoadOlder}
          onEndReachedThreshold={0.4}
          // In inverted FlatList, contentContainer padding is applied in DOM and
          // then the whole list is scaleY-flipped — so paddingTop here becomes
          // the visual bottom (where the tag sits below the newest bubble).
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 }}
          style={{ flex: 1, backgroundColor: BG }}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
        />

        <ChatInput onSend={handleSend} disabled={isStreaming} draft={draft} />
      </KeyboardAvoidingView>

      <MatchLogForm
        visible={showMatchForm}
        onClose={() => {
          setShowMatchForm(false);
          setMatchLogPrefill(undefined);
          setMatchLogMessageId(undefined);
        }}
        onSaved={handleMatchSaved}
        prefill={matchLogPrefill}
        messageId={matchLogMessageId}
      />

      <PreparationSheet preparation={openPrep} onClose={() => setOpenPrepId(null)} />

      <LockedBottomSheet
        visible={lockedSheetOpen}
        onClose={() => setLockedSheetOpen(false)}
      />

      {selectedMessage && (
        <MessageActionSheet
          content={selectedMessage.content}
          messageId={selectedMessage.id}
          role={selectedMessage.role}
          feedbackScore={feedbackState[selectedMessage.id]}
          onClose={() => setSelectedMessage(null)}
          onFeedback={(score) => handleFeedback(selectedMessage.id, score)}
          onRetry={() => handleRetry(selectedMessage.id)}
          onHide={() => handleHide(selectedMessage.id)}
        />
      )}
    </SafeAreaView>
  );
}
