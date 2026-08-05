import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMatches } from '@/hooks/useMatches';
import {
  useDeleteMatchPreparation,
  useReplaceDrills,
  useSuggestPreparationDrills,
  useUpdateMatchPreparation,
} from '@/hooks/usePreparation';
import type { DrillInput, MatchLog, MatchPreparation, MatchPreparationPlanGrade } from '@/types/api';
import { DashedBox } from '@/components/ui/DashedBox';
import {
  preparationColors as C,
  preparationFonts as F,
  stickerShadow,
  stickerShadowSm,
} from './theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.94;
const NOTE_MAX = 200;

const WEEKDAY_LONG = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LONG = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const formatLongDate = (iso: string): string => {
  const d = new Date(iso);
  const wd = WEEKDAY_LONG[d.getUTCDay()] ?? '';
  const day = d.getUTCDate();
  const mo = MONTH_LONG[d.getUTCMonth()] ?? '';
  return `${wd} ${day} ${mo}`;
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.round(seconds / 60);
  return `${m} min`;
};

const MONTH_SHORT_UPPER = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// "18 Apr" — short day + month, no year (we hide rows older than ~1y anyway).
const formatShortDay = (iso: string): string => {
  const d = new Date(iso);
  const day = d.getUTCDate();
  const mo = MONTH_SHORT_UPPER[d.getUTCMonth()] ?? '';
  return `${day} ${mo}`;
};

// Opponent set key for matching a preparation to its prior encounters — case-
// insensitive and order-insensitive, since a player might log "Lucia & Pablo"
// one week and "pablo, lucia" the next.
const opponentKey = (names: string[]): string =>
  names
    .map((n) => n.trim().toLowerCase())
    .filter((n) => n.length > 0)
    .sort()
    .join('|');

// findLastVsThem picks the most recent past match against the same opponent
// pair. It excludes the preparation's own linked match log (so a *past* prep
// doesn't end up linking to itself) and any matches in the future.
const findLastVsThem = (
  preparation: MatchPreparation,
  matches: MatchLog[],
): MatchLog | null => {
  const key = opponentKey(preparation.opponents);
  if (!key) return null;
  const now = Date.now();
  let best: MatchLog | null = null;
  for (const m of matches) {
    if (m.id === preparation.match_log_id) continue;
    if (opponentKey(m.opponents) !== key) continue;
    const played = new Date(m.played_on).getTime();
    if (Number.isNaN(played) || played > now) continue;
    if (!best || played > new Date(best.played_on).getTime()) {
      best = m;
    }
  }
  return best;
};

// "Lost 5–7" — pulls the score off the freeform note (the player's own
// shorthand) when it's there, else falls back to a plain "Won/Lost/Draw".
const summariseLastMatch = (m: MatchLog): string => {
  const trimmed = m.note?.trim();
  const head =
    m.result === 'won' ? 'Won'
    : m.result === 'lost' ? 'Lost'
    : m.result === 'draw' ? 'Drew'
    : 'Played';
  if (trimmed) return `${head} ${trimmed}`;
  return head;
};

type DraftDrill = {
  key: string;
  serverId: string | null;
  title: string;
  durationSeconds: number;
  completed: boolean;
};

type Props = {
  preparation: MatchPreparation | null;
  onClose: () => void;
};

export function PreparationSheet({ preparation, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const visible = preparation !== null;

  // SheetBody owns the draft state, so it owns the "is anything unsaved"
  // question. It publishes its guarded close here so the backdrop tap and the
  // Android back gesture warn the same way the ✕ does.
  const guardedClose = useRef<(() => void) | null>(null);
  const requestClose = useCallback(() => {
    (guardedClose.current ?? onClose)();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={requestClose}>
      <View style={{ flex: 1 }}>
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: C.scrim }]}
          onPress={requestClose}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: SHEET_HEIGHT,
            backgroundColor: C.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            shadowColor: C.ink,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.18,
            shadowRadius: 12,
            elevation: 20,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 2 }}>
            <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: C.stone }} />
          </View>

          {preparation ? (
            <SheetBody
              preparation={preparation}
              onClose={onClose}
              guardedCloseRef={guardedClose}
              bottomInset={insets.bottom}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

type SheetBodyProps = {
  preparation: MatchPreparation;
  onClose: () => void;
  /** Filled with the discard-confirming close so the parent's backdrop and
   *  back gesture route through it too. */
  guardedCloseRef: MutableRefObject<(() => void) | null>;
  bottomInset: number;
};

function SheetBody({
  preparation,
  onClose,
  guardedCloseRef,
  bottomInset,
}: SheetBodyProps) {
  const router = useRouter();
  const replaceDrills = useReplaceDrills();
  const updatePreparation = useUpdateMatchPreparation();
  const suggestDrills = useSuggestPreparationDrills();
  const deletePreparation = useDeleteMatchPreparation();
  const { data: matches = [] } = useMatches();

  const lastVsThem = useMemo(
    () => findLastVsThem(preparation, matches),
    [preparation, matches],
  );

  const [drills, setDrills] = useState<DraftDrill[]>(() => toDrafts(preparation.drills));
  const [note, setNote] = useState(preparation.note ?? '');
  const [newTitle, setNewTitle] = useState('');
  const [newMinutes, setNewMinutes] = useState('5');
  const [suggestions, setSuggestions] = useState<DrillInput[]>([]);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  // Shared failure line for save / status / grade mutations — without it a
  // failed write looks identical to a successful one.
  const [actionError, setActionError] = useState<string | null>(null);
  const lastPreparationId = useRef(preparation.id);

  useEffect(() => {
    if (lastPreparationId.current !== preparation.id) {
      lastPreparationId.current = preparation.id;
      setDrills(toDrafts(preparation.drills));
      setNote(preparation.note ?? '');
      setNewTitle('');
      setNewMinutes('5');
      setSuggestions([]);
      setSuggestError(null);
    }
  }, [preparation.id, preparation.drills, preparation.note]);

  const headline =
    preparation.opponents.length > 0
      ? preparation.opponents.join(' & ')
      : 'Upcoming match';

  const dateLine = `${formatLongDate(preparation.scheduled_at)} · ${formatTime(preparation.scheduled_at)}${preparation.court ? ` · ${preparation.court}` : ''}`;

  // Nothing in this sheet is written until handleSave runs, so the footer has
  // to say which of the two it is — and closing has to warn rather than drop
  // the queue and note edits on the floor.
  const dirty = useMemo(() => {
    if ((preparation.note ?? '') !== note) return true;
    const saved = preparation.drills;
    if (saved.length !== drills.length) return true;
    return drills.some(
      (d, i) =>
        d.title !== saved[i]!.title ||
        d.durationSeconds !== saved[i]!.duration_seconds ||
        d.completed !== saved[i]!.completed,
    );
  }, [drills, note, preparation.drills, preparation.note]);

  const closeWithConfirm = useCallback(() => {
    if (!dirty) {
      onClose();
      return;
    }
    Alert.alert(
      'Discard changes?',
      "Your queue and note edits haven't been saved yet.",
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onClose },
      ],
    );
  }, [dirty, onClose]);

  useEffect(() => {
    guardedCloseRef.current = closeWithConfirm;
    return () => {
      guardedCloseRef.current = null;
    };
  }, [closeWithConfirm, guardedCloseRef]);

  const done = drills.filter((d) => d.completed).length;
  const total = drills.length;
  const preparationPct = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  }, [done, total]);

  const addDrill = (input: DrillInput) => {
    const dur = Math.max(60, Math.min(7200, Math.round(input.duration_seconds)));
    const title = input.title.trim();
    if (!title) return;
    setDrills((prev) => [
      ...prev,
      {
        key: `draft-${Math.random().toString(36).slice(2)}`,
        serverId: null,
        title,
        durationSeconds: dur,
        completed: false,
      },
    ]);
  };

  const removeDrill = (key: string) => {
    setDrills((prev) => prev.filter((d) => d.key !== key));
  };

  const toggleLocal = (key: string) => {
    setDrills((prev) =>
      prev.map((d) => (d.key === key ? { ...d, completed: !d.completed } : d)),
    );
  };

  const moveDrill = (key: string, direction: -1 | 1) => {
    setDrills((prev) => {
      const idx = prev.findIndex((d) => d.key === key);
      const target = idx + direction;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      const moved = next.splice(idx, 1)[0];
      if (!moved) return prev;
      next.splice(target, 0, moved);
      return next;
    });
  };

  const handleAddFreeform = () => {
    const minutes = parseInt(newMinutes, 10);
    if (!newTitle.trim()) return;
    addDrill({
      title: newTitle.trim(),
      duration_seconds: Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : 300,
    });
    setNewTitle('');
    setNewMinutes('5');
  };

  const handleAddSuggestion = (s: DrillInput) => {
    addDrill(s);
    setSuggestions((prev) => prev.filter((p) => p.title !== s.title));
  };

  const handleAskMarco = () => {
    setSuggestError(null);
    suggestDrills.mutate(preparation.id, {
      onSuccess: (data) => {
        const existingTitles = new Set(drills.map((d) => d.title.toLowerCase()));
        const filtered = data.filter((s) => !existingTitles.has(s.title.toLowerCase()));
        setSuggestions(filtered.length > 0 ? filtered : data);
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Marco is unavailable';
        setSuggestError(message);
      },
    });
  };

  const handleSave = async () => {
    // The PUT /drills endpoint accepts `completed` per row, so the queue and
    // every check the user flipped in this session commit atomically. We
    // can't post-toggle by id, because replace assigns fresh UUIDs and the
    // pre-save serverIds no longer exist.
    const queue: DrillInput[] = drills.map((d) => ({
      title: d.title,
      duration_seconds: d.durationSeconds,
      completed: d.completed,
    }));

    setActionError(null);
    try {
      await replaceDrills.mutateAsync({ id: preparation.id, drills: queue });

      if ((preparation.note ?? '') !== note.trim()) {
        await updatePreparation.mutateAsync({
          id: preparation.id,
          data: { note: note.trim() },
        });
      }
    } catch {
      // Keep the sheet open with the draft intact so nothing is lost.
      setActionError("Couldn't save your changes — check your connection and try again.");
      return;
    }
    onClose();
  };

  const handleOpenChat = () => {
    onClose();
    router.push('/(tabs)/chat');
  };

  // Native confirm so an accidental tap on the trash icon can't wipe a prep
  // the user spent time on. The "Delete" button is the destructive style on
  // iOS — Android shows it as plain text but with the same intent.
  const handleDelete = () => {
    const headlineForPrompt =
      preparation.opponents.length > 0
        ? `Delete prep vs ${preparation.opponents.join(' & ')}?`
        : 'Delete this prep?';
    Alert.alert(
      headlineForPrompt,
      'Drills, notes and the link back to chat will be removed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePreparation.mutate(preparation.id, {
              onSuccess: () => onClose(),
              onError: (err: unknown) => {
                const message = err instanceof Error ? err.message : 'Failed to delete';
                Alert.alert('Could not delete', message);
              },
            });
          },
        },
      ],
    );
  };

  const saving = replaceDrills.isPending || updatePreparation.isPending;
  const deleting = deletePreparation.isPending;

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: 4,
        }}
      >
        <Text
          style={{
            fontFamily: F.mono,
            fontSize: 11,
            color: C.mute,
            letterSpacing: 0.9,
          }}
        >
          PREPARATION
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <Pressable
            onPress={handleDelete}
            disabled={deleting}
            hitSlop={12}
            accessibilityLabel="Delete preparation"
          >
            {deleting ? (
              <ActivityIndicator size="small" color={C.ink} />
            ) : (
              <Text style={{ fontSize: 18, color: C.ink, opacity: 0.75 }}>🗑</Text>
            )}
          </Pressable>
          <Pressable onPress={closeWithConfirm} hitSlop={12} accessibilityLabel="Close">
            <Text style={{ fontSize: 22, color: C.ink }}>✕</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero: PREP badge + status select + big serif title + date / partner */}
        <View style={{ marginTop: 14, marginBottom: 10 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <View
              style={[
                {
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  backgroundColor: preparation.played_at ? C.teal : C.clay,
                  borderRadius: 5,
                },
                stickerShadowSm,
              ]}
            >
              <Text
                style={{
                  fontFamily: F.mono,
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#FFFFFF',
                  letterSpacing: 0.96,
                }}
              >
                {preparation.played_at ? 'PLAYED' : 'PREP'}
              </Text>
            </View>

            <StatusSelect
              playedAt={preparation.played_at}
              disabled={updatePreparation.isPending}
              onChange={(next) =>
                updatePreparation.mutate(
                  {
                    id: preparation.id,
                    data:
                      next === 'played'
                        ? { played_at: 'now' }
                        : // Dropping back to upcoming has to clear the grade too.
                          // GradeSelect is hidden for an unplayed future prep, so
                          // a leftover grade is unreachable in the UI while still
                          // counting toward the plan-worked stats.
                          { played_at: '', plan_grade: '' },
                  },
                  { onError: () => setActionError("Couldn't update the match status — try again.") },
                )
              }
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
            <Text style={{ fontFamily: F.mono, fontSize: 16, color: C.mute }}>vs</Text>
            <Text
              style={{
                // flex:1 so a long opponent name wraps across the allowed two
                // lines instead of sizing to intrinsic width and being clipped.
                flex: 1,
                fontFamily: F.serif,
                fontSize: 28,
                color: C.ink,
                lineHeight: 30,
                letterSpacing: -0.4,
              }}
              numberOfLines={2}
            >
              {headline}
            </Text>
          </View>

          <Text
            style={{
              fontFamily: F.mono,
              fontSize: 12,
              color: C.mute,
              marginTop: 6,
              letterSpacing: 0.2,
            }}
          >
            {dateLine}
          </Text>

          {preparation.partner_name ? (
            <Text
              style={{ fontFamily: F.mono, fontSize: 12, color: C.mute, marginTop: 2 }}
            >
              w/ <Text style={{ color: C.ink }}>{preparation.partner_name}</Text>
            </Text>
          ) : null}
        </View>

        {/* Preparation meter */}
        <View style={{ marginTop: 6, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text
              style={{
                fontFamily: F.monoBold,
                fontSize: 10,
                color: C.ink,
                letterSpacing: 0.8,
              }}
            >
              PREPARATION
            </Text>
            <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.mute }}>
              · {done}
              <Text style={{ color: C.mute }}>/</Text>
              {total} drills ·{' '}
              <Text style={{ color: C.teal, fontFamily: F.monoBold }}>{preparationPct}%</Text>
            </Text>
          </View>
          <View
            style={{
              height: 8,
              backgroundColor: C.stoneSoft,
              borderRadius: 999,
              marginTop: 8,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${Math.min(100, Math.max(0, preparationPct))}%`,
                height: '100%',
                backgroundColor: C.clay,
              }}
            />
          </View>
        </View>

        {preparation.played_at !== null ||
        new Date(preparation.scheduled_at).getTime() < Date.now() ? (
          <GradeSelect
            grade={preparation.plan_grade}
            disabled={updatePreparation.isPending}
            onChange={(next) =>
              updatePreparation.mutate(
                {
                  id: preparation.id,
                  data: { plan_grade: next ?? '' },
                },
                { onError: () => setActionError("Couldn't save the plan grade — try again.") },
              )
            }
          />
        ) : null}

        {/* Queue */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontFamily: F.monoBold,
              fontSize: 10,
              color: C.ink,
              letterSpacing: 0.8,
            }}
          >
            MARCO&apos;S QUEUE
          </Text>
          <Text style={{ fontFamily: F.hand, fontSize: 14, color: C.mute }}>
            tap ✎ to edit
          </Text>
        </View>

        {drills.length === 0 ? (
          <DashedBox
            radius={12}
            color={C.stone}
            style={{ padding: 16, alignItems: 'center', marginBottom: 8 }}
          >
            <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.mute }}>
              No drills yet — add one below or ask Marco.
            </Text>
          </DashedBox>
        ) : (
          drills.map((d, i) => (
            <DrillRow
              key={d.key}
              drill={d}
              isFirst={i === 0}
              isLast={i === drills.length - 1}
              onToggle={() => toggleLocal(d.key)}
              onRemove={() => removeDrill(d.key)}
              onMoveUp={() => moveDrill(d.key, -1)}
              onMoveDown={() => moveDrill(d.key, 1)}
            />
          ))
        )}

        {/* Add your own */}
        <Text
          style={{
            fontFamily: F.monoBold,
            fontSize: 10,
            color: C.ink,
            letterSpacing: 0.8,
            marginTop: 18,
            marginBottom: 8,
          }}
        >
          ADD YOUR OWN
        </Text>
        <View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.ink,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
            },
            stickerShadowSm,
          ]}
        >
          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="Drill name…"
            placeholderTextColor={C.mute}
            style={{
              flex: 1,
              fontSize: 13,
              color: C.ink,
              paddingVertical: 6,
            }}
            returnKeyType="done"
            onSubmitEditing={handleAddFreeform}
          />
          <TextInput
            value={newMinutes}
            onChangeText={setNewMinutes}
            keyboardType="number-pad"
            style={{
              width: 44,
              fontFamily: F.mono,
              fontSize: 13,
              color: C.ink,
              paddingVertical: 6,
              textAlign: 'right',
            }}
          />
          <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.mute }}>min</Text>
          <Pressable
            onPress={handleAddFreeform}
            disabled={!newTitle.trim()}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: newTitle.trim() ? C.clay : C.stoneSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>+</Text>
          </Pressable>
        </View>

        {/* Marco suggestions */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 18,
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontFamily: F.monoBold,
              fontSize: 10,
              color: C.ink,
              letterSpacing: 0.8,
            }}
          >
            OR PICK FROM MARCO
          </Text>
          <Pressable
            onPress={handleAskMarco}
            disabled={suggestDrills.isPending}
            hitSlop={8}
            style={{ paddingHorizontal: 10, paddingVertical: 6 }}
          >
            {suggestDrills.isPending ? (
              <ActivityIndicator size="small" color={C.teal} />
            ) : (
              <Text
                style={{
                  fontFamily: F.mono,
                  fontSize: 11,
                  color: C.teal,
                  fontWeight: '700',
                }}
              >
                {suggestions.length > 0 ? 'REFRESH' : 'ASK MARCO'}
              </Text>
            )}
          </Pressable>
        </View>

        {suggestError ? (
          <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.clay, marginBottom: 8 }}>
            {suggestError}
          </Text>
        ) : null}

        {suggestions.map((s) => (
          <Pressable
            key={`${s.title}-${s.duration_seconds}`}
            onPress={() => handleAddSuggestion(s)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: C.paper,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 6,
            }}
          >
            <Text style={{ fontSize: 18, color: C.clay, fontWeight: '700' }}>+</Text>
            <Text
              style={{ flex: 1, fontSize: 13, color: C.ink, fontWeight: '600' }}
              numberOfLines={1}
            >
              {s.title}
            </Text>
            <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.mute }}>
              {formatDuration(s.duration_seconds)}
            </Text>
          </Pressable>
        ))}

        {/* Note */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginTop: 18,
            marginBottom: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text
              style={{
                fontFamily: F.monoBold,
                fontSize: 10,
                color: C.ink,
                letterSpacing: 0.8,
              }}
            >
              NOTE
            </Text>
            <Text
              style={{
                fontFamily: F.mono,
                fontSize: 9,
                color: C.mute,
                letterSpacing: 0.6,
              }}
            >
              OPTIONAL
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: C.mute }}>✎</Text>
        </View>

        <View
          style={[
            {
              backgroundColor: C.paper,
              borderWidth: 1,
              borderColor: C.stone,
              borderRadius: 12,
              padding: 12,
            },
            stickerShadowSm,
          ]}
        >
          <TextInput
            value={note}
            onChangeText={(text) => {
              if (text.length <= NOTE_MAX) setNote(text);
            }}
            // A finished sentence about the user's knee, set in the same
            // handwriting as a saved note, reads as saved data — the match-log
            // note asks a question instead, so this one does too.
            placeholder="Anything Marco should know before this one?"
            placeholderTextColor={C.mute}
            multiline
            style={{
              minHeight: 70,
              fontFamily: F.hand,
              fontSize: 17,
              color: C.ink,
              textAlignVertical: 'top',
              lineHeight: 22,
            }}
          />
          <Text
            style={{
              fontFamily: F.mono,
              fontSize: 10,
              color: C.mute,
              alignSelf: 'flex-end',
              marginTop: 4,
            }}
          >
            {note.length} / {NOTE_MAX}
          </Text>
        </View>

        {lastVsThem ? (
          <LastVsThem
            match={lastVsThem}
            onOpen={() => {
              onClose();
              router.push({ pathname: '/matches', params: { match: lastVsThem.id } });
            }}
          />
        ) : null}
      </ScrollView>

      {actionError ? (
        <Text
          style={{
            fontFamily: F.mono,
            fontSize: 12,
            color: C.clay,
            paddingHorizontal: 24,
            paddingTop: 8,
          }}
        >
          {actionError}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: bottomInset + 16,
          borderTopWidth: 1,
          borderTopColor: C.inkSoft,
          backgroundColor: C.bg,
        }}
      >
        <Pressable
          onPress={handleOpenChat}
          style={[
            {
              flex: 1,
              paddingVertical: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: C.ink,
              backgroundColor: C.card,
              alignItems: 'center',
            },
            stickerShadowSm,
          ]}
        >
          <Text
            style={{ color: C.ink, fontFamily: 'Inter', fontWeight: '600', fontSize: 13 }}
          >
            Open in chat
          </Text>
        </Pressable>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[
            {
              flex: 1.2,
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: saving ? '#7A8E96' : C.teal,
              alignItems: 'center',
            },
            stickerShadow,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
              {/* Everything in this sheet is a draft until this button commits
                  it. "Adjust queue" read like a way into another editor, so a
                  checked drill or an edited note was easy to lose by closing. */}
              {dirty ? 'Save changes' : 'Done'}
            </Text>
          )}
        </Pressable>
      </View>
    </>
  );
}

type DrillRowProps = {
  drill: DraftDrill;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function DrillRow({ drill, isFirst, isLast, onToggle, onRemove, onMoveUp, onMoveDown }: DrillRowProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.ink,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 8,
        },
        stickerShadowSm,
      ]}
    >
      <Pressable onPress={onToggle} hitSlop={8}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            borderWidth: 1.5,
            borderColor: drill.completed ? C.teal : C.stone,
            backgroundColor: drill.completed ? C.teal : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {drill.completed ? (
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>✓</Text>
          ) : null}
        </View>
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '500',
            color: C.ink,
            textDecorationLine: drill.completed ? 'line-through' : 'none',
          }}
          numberOfLines={2}
        >
          {drill.title}
        </Text>
        <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, marginTop: 2 }}>
          {formatDuration(drill.durationSeconds)}
        </Text>
      </View>

      <View style={{ flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Pressable
          onPress={onMoveUp}
          hitSlop={6}
          disabled={isFirst}
          style={{ opacity: isFirst ? 0.25 : 1, paddingHorizontal: 4 }}
        >
          <Text style={{ fontSize: 12, color: C.mute }}>▲</Text>
        </Pressable>
        <Pressable
          onPress={onMoveDown}
          hitSlop={6}
          disabled={isLast}
          style={{ opacity: isLast ? 0.25 : 1, paddingHorizontal: 4 }}
        >
          <Text style={{ fontSize: 12, color: C.mute }}>▼</Text>
        </Pressable>
      </View>

      <Pressable onPress={onRemove} hitSlop={8}>
        <Text style={{ fontSize: 16, color: C.mute, fontWeight: '700' }}>✕</Text>
      </Pressable>
    </View>
  );
}

type StatusValue = 'upcoming' | 'played';

type StatusSelectProps = {
  playedAt: string | null;
  disabled: boolean;
  onChange: (next: StatusValue) => void;
};

const STATUS_OPTIONS: { value: StatusValue; label: string; helper: string }[] = [
  { value: 'upcoming', label: 'Upcoming', helper: 'Not yet played' },
  { value: 'played', label: 'Played', helper: 'Mark as done now' },
];

function StatusSelect({ playedAt, disabled, onChange }: StatusSelectProps) {
  const [open, setOpen] = useState(false);
  const current: StatusValue = playedAt ? 'played' : 'upcoming';
  const label =
    current === 'played'
      ? `Played · ${formatPlayedAt(playedAt!)}`
      : 'Upcoming';
  const accent = current === 'played' ? C.teal : C.ink;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: C.ink,
            backgroundColor: C.card,
            opacity: disabled ? 0.5 : 1,
          },
          stickerShadowSm,
        ]}
      >
        <Text
          style={{
            fontFamily: F.mono,
            fontSize: 11,
            fontWeight: '700',
            color: accent,
            letterSpacing: 0.4,
          }}
        >
          {label}
        </Text>
        <Text style={{ fontSize: 10, color: C.mute }}>▾</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: C.scrim }]}
          onPress={() => setOpen(false)}
        />
        <View
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            top: '38%',
            backgroundColor: C.bg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.ink,
            padding: 12,
            ...stickerShadow,
          }}
        >
          <Text
            style={{
              fontFamily: F.monoBold,
              fontSize: 10,
              color: C.mute,
              letterSpacing: 0.8,
              marginBottom: 8,
              paddingHorizontal: 4,
            }}
          >
            STATUS
          </Text>
          {STATUS_OPTIONS.map((opt) => {
            const selected = opt.value === current;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  setOpen(false);
                  if (opt.value !== current) onChange(opt.value);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: selected ? C.paper : 'transparent',
                }}
              >
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    borderWidth: 1.5,
                    borderColor: selected ? C.teal : C.stone,
                    backgroundColor: selected ? C.teal : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selected ? (
                    <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700' }}>✓</Text>
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: F.serif,
                      fontSize: 18,
                      color: C.ink,
                      lineHeight: 20,
                    }}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={{
                      fontFamily: F.mono,
                      fontSize: 11,
                      color: C.mute,
                      marginTop: 1,
                    }}
                  >
                    {opt.helper}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </>
  );
}

type GradeSelectProps = {
  grade: MatchPreparation['plan_grade'];
  disabled: boolean;
  onChange: (next: MatchPreparationPlanGrade | null) => void;
};

const GRADE_OPTIONS: {
  value: MatchPreparationPlanGrade;
  label: string;
  glyph: string;
  activeBg: string;
}[] = [
  { value: 'worked', label: 'Worked', glyph: '↑', activeBg: C.teal },
  { value: 'mixed',  label: 'Mixed',  glyph: '~', activeBg: C.ink },
  { value: 'missed', label: 'Missed', glyph: '↓', activeBg: C.clay },
];

function GradeSelect({ grade, disabled, onChange }: GradeSelectProps) {
  return (
    <View style={{ marginTop: 14 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontFamily: F.monoBold,
            fontSize: 10,
            color: C.ink,
            letterSpacing: 0.8,
          }}
        >
          DID THE PLAN WORK?
        </Text>
        <Text
          style={{
            fontFamily: F.mono,
            fontSize: 10,
            color: C.mute,
            letterSpacing: 0.6,
          }}
        >
          YOU GRADE IT
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          backgroundColor: C.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: C.ink,
          padding: 4,
          gap: 4,
        }}
      >
        {GRADE_OPTIONS.map((opt) => {
          const active = grade === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(active ? null : opt.value)}
              disabled={disabled}
              style={[
                {
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: active ? opt.activeBg : 'transparent',
                  opacity: disabled ? 0.6 : 1,
                },
                active ? stickerShadowSm : null,
              ]}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: active ? '#FFFFFF' : C.mute,
                  lineHeight: 14,
                }}
              >
                {opt.glyph}
              </Text>
              <Text
                style={{
                  fontFamily: F.mono,
                  fontSize: 13,
                  fontWeight: '700',
                  color: active ? '#FFFFFF' : C.mute,
                  letterSpacing: 0.2,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text
        style={{
          fontFamily: F.hand,
          fontSize: 14,
          color: C.mute,
          marginTop: 6,
        }}
      >
        Marco will adjust next time vs similar opponents.
      </Text>
    </View>
  );
}

// "19 May" — short day + month, no year. Matches the LastVsThem block.
const formatPlayedAt = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getUTCDate();
  const mo = MONTH_SHORT_UPPER[d.getUTCMonth()] ?? '';
  return `${day} ${mo}`;
};

type LastVsThemProps = {
  match: MatchLog;
  onOpen: () => void;
};

function LastVsThem({ match, onOpen }: LastVsThemProps) {
  const summary = summariseLastMatch(match);
  const accent =
    match.result === 'won' ? C.teal : match.result === 'lost' ? C.clay : C.mute;
  return (
    <View style={{ marginTop: 18 }}>
      <Text
        style={{
          fontFamily: F.monoBold,
          fontSize: 10,
          color: C.ink,
          letterSpacing: 0.8,
          marginBottom: 8,
        }}
      >
        LAST VS THEM ·
      </Text>
      <Pressable
        onPress={onOpen}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.ink,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
          },
          stickerShadowSm,
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, color: C.ink, fontWeight: '600' }} numberOfLines={1}>
            <Text style={{ color: accent }}>{summary}</Text> vs same pair
          </Text>
          <Text
            style={{
              fontFamily: F.mono,
              fontSize: 11,
              color: C.mute,
              marginTop: 2,
              letterSpacing: 0.4,
            }}
          >
            {formatShortDay(match.played_on)}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: F.mono,
            fontSize: 12,
            fontWeight: '700',
            color: C.teal,
          }}
        >
          Open log ›
        </Text>
      </Pressable>
    </View>
  );
}

const toDrafts = (drills: MatchPreparation['drills']): DraftDrill[] =>
  drills.map((d) => ({
    key: d.id,
    serverId: d.id,
    title: d.title,
    durationSeconds: d.duration_seconds,
    completed: d.completed,
  }));
