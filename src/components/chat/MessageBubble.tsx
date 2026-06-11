import { Image, Pressable, Text, View } from 'react-native';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import {
  preparationColors as PC,
  stickerShadow,
} from '@/components/preparation/theme';
import { useLessons } from '@/hooks/useLessons';
import type { ChatMessage, MatchLogPrefill, MatchPrepPrefill } from '@/types/api';

type LessonRef = { id: string; title: string };

type MessageBubbleProps = {
  message: ChatMessage;
  showAvatar?: boolean;
  onLongPress?: () => void;
  // Renders the "Log this match" pill (or "Logged" badge) under the bubble
  // when the assistant message carries a match_log_prefill. The chat screen
  // owns the open-form / saved-state logic and passes the handler in.
  onLogMatchPress?: (prefill: MatchLogPrefill) => void;
  matchLogged?: boolean;
  // Same pattern as onLogMatchPress, for [MATCH_PREP: ...] tokens. The tag
  // text adapts to the mode: "Adjust prep" for adjust, "Set up prep" for
  // create. Once a create-mode token has been turned into a real prep, the
  // chat passes prepCreated=true so the tag flips to "Opened" to discourage
  // tapping again.
  onPrepPress?: (prefill: MatchPrepPrefill) => void;
  prepCreated?: boolean;
  // Lesson cards rendered as tappable rows beneath the bubble. Source is the
  // assistant message's parsed [LESSON_REF: ...] tokens — either delivered by
  // the server on history reload or parsed client-side mid-stream. The chat
  // screen owns navigation so the bubble stays presentational.
  lessonRefs?: LessonRef[];
  onLessonPress?: (ref: LessonRef) => void;
  // Tapped when the referenced lesson is premium/locked. Lets the chat
  // screen open the same "Premium lesson" upgrade sheet the journey screen
  // shows on locked nodes, instead of routing to a detail screen that the
  // user can't open.
  onLockedLessonPress?: (ref: LessonRef) => void;
};

export function MessageBubble({
  message,
  showAvatar = false,
  onLongPress,
  onLogMatchPress,
  matchLogged,
  onPrepPress,
  prepCreated,
  lessonRefs,
  onLessonPress,
  onLockedLessonPress,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const prefill = message.match_log_prefill;
  const prepPrefill = message.match_prep_prefill;
  const showLogTag = !isUser && prefill !== undefined;
  const showPrepTag = !isUser && prepPrefill !== undefined;
  const showLessonCards = !isUser && lessonRefs !== undefined && lessonRefs.length > 0;

  if (isUser) {
    return (
      <View style={{ marginBottom: 4, alignItems: 'flex-end' }}>
        <Pressable onLongPress={onLongPress} delayLongPress={400} style={{ maxWidth: '80%' }}>
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 20,
              borderBottomRightRadius: 4,
              backgroundColor: '#0F4C5C',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 15, lineHeight: 22 }}>{message.content}</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 4, flexDirection: 'row', alignItems: 'flex-end' }}>
      <View style={{ width: 32, marginRight: 8, alignSelf: 'flex-end' }}>
        {showAvatar && <MarcoAvatar size={32} />}
      </View>
      <View style={{ maxWidth: '75%' }}>
        <Pressable onLongPress={onLongPress} delayLongPress={400}>
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 20,
              borderBottomLeftRadius: 4,
              backgroundColor: '#FFFFFF',
              shadowColor: '#1A2A30',
              shadowOffset: { width: 2, height: 2 },
              shadowOpacity: 1,
              shadowRadius: 0,
              elevation: 3,
            }}
          >
            <Text style={{ color: '#0B1416', fontSize: 15, lineHeight: 22 }}>{message.content}</Text>
          </View>
        </Pressable>
        {showLogTag && (
          <MatchLogTag
            logged={matchLogged === true}
            onPress={() => onLogMatchPress?.(prefill!)}
          />
        )}
        {showPrepTag && (
          <MatchPrepTag
            mode={prepPrefill!.mode}
            opened={prepCreated === true}
            onPress={() => onPrepPress?.(prepPrefill!)}
          />
        )}
        {showLessonCards &&
          lessonRefs!.map((ref) => (
            <LessonCard
              key={ref.id}
              slug={ref.id}
              title={ref.title}
              onPress={() => onLessonPress?.(ref)}
              onLockedPress={() => onLockedLessonPress?.(ref)}
            />
          ))}
      </View>
    </View>
  );
}

function MatchLogTag({ logged, onPress }: { logged: boolean; onPress: () => void }) {
  if (logged) {
    return (
      <View
        style={{
          alignSelf: 'flex-start',
          marginTop: 6,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: '#E5F4EC',
          borderWidth: 1,
          borderColor: '#10B981',
        }}
      >
        <Text style={{ color: '#047857', fontSize: 12, fontWeight: '600' }}>✓ Logged</Text>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={{
        alignSelf: 'flex-start',
        marginTop: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#E36414',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>📝 Log this match</Text>
    </Pressable>
  );
}

function MatchPrepTag({
  mode,
  opened,
  onPress,
}: {
  mode: 'adjust' | 'create';
  opened: boolean;
  onPress: () => void;
}) {
  // Once the user has opened a create-mode prep (i.e. we already turned the
  // prefill into a real DB row), flip the pill to a quieter "Prep ready"
  // state. Tapping re-opens the same prep — handlePrepPress short-circuits
  // to the cached id, so no duplicate create. Adjust-mode tags never reach
  // this state — the prep already exists.
  if (opened) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={6}
        style={{
          alignSelf: 'flex-start',
          marginTop: 6,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: '#E5F4EC',
          borderWidth: 1,
          borderColor: '#10B981',
        }}
      >
        <Text style={{ color: '#047857', fontSize: 12, fontWeight: '600' }}>✓ Prep ready</Text>
      </Pressable>
    );
  }
  const label = mode === 'adjust' ? '🎾 Adjust prep' : '🎾 Set up prep';
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={{
        alignSelf: 'flex-start',
        marginTop: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#0F4C5C',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

// LessonCard renders one [LESSON_REF: ...] under the assistant bubble.
// Styles are lifted directly from "D _ Tactical Q_A _ rich answer.html" by
// walking the DOM around the LESSON text node:
//
//   card               { bg #FEFBF5, padding 8/10, shadow 2px 2px 0 0 ink,
//                        flex row, align-items center, no border, no radius }
//   thumbnail tile     { 56x42, bg #0C1C22, flex centered }
//   text column        { stacked, flush against the thumbnail, ~209px wide }
//     LESSON · NN SEC  { color #4A5560, 11px / 400, letter-spacing 0.66 }
//     title            { color #1A2A30, 13px / 600 }
//   trailing arrow     { ▸ color #0F4C5C (teal), 14px / 700 }
//
// We look up the lesson by slug in the curriculum cache so the duration
// suffix ("· 90 SEC") and the real thumbnail image appear when available.
// When the cache hasn't loaded yet, the card degrades gracefully: dark-slab
// placeholder + "LESSON" alone.
function LessonCard({
  slug,
  title,
  onPress,
  onLockedPress,
}: {
  slug: string;
  title: string;
  onPress: () => void;
  onLockedPress: () => void;
}) {
  const { data: lessons = [] } = useLessons();
  const lesson = lessons.find((l) => l.slug === slug);
  const durationSec = lesson?.duration_seconds ?? null;
  const thumbnailUrl = lesson?.thumbnail_url ?? null;
  // Premium lessons can't be opened — tapping should surface the same
  // upgrade sheet the journey screen uses for locked nodes, not the
  // detail screen (which falls through to "Couldn't load this lesson").
  const locked = lesson?.locked === true;

  if (locked) {
    return (
      <Pressable
        onPress={onLockedPress}
        hitSlop={4}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 12,
              backgroundColor: PC.bg,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: '#c7bfb2',
              marginTop: 10,
            },
            stickerShadow,
          ]}
        >
          <View
            style={{
              width: 56,
              height: 42,
              backgroundColor: '#F5F0E8',
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: '#c7bfb2',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18 }}>🔒</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                color: PC.mute,
                fontSize: 11,
                fontWeight: '400',
                letterSpacing: 0.66,
                lineHeight: 14.5,
              }}
            >
              PREMIUM LESSON
            </Text>
            <Text
              numberOfLines={2}
              style={{
                color: '#9CA3AF',
                fontSize: 13,
                fontWeight: '600',
                lineHeight: 15,
                marginTop: 1,
              }}
            >
              {title}
            </Text>
          </View>
          <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '700' }}>🔒</Text>
        </View>
      </Pressable>
    );
  }

  const label = durationSec != null ? `LESSON · ${durationSec} SEC` : 'LESSON';

  // Layout pattern mirrors DrillRow in PreparationSheet. The outer Pressable
  // handles only the press-state opacity; ALL layout styles live on a plain
  // inner View. Earlier revisions put flexDirection:'row' on the Pressable
  // itself and the screenshot still rendered as a vertical stack — the
  // existing tag components on this file only ever wrap a single Text child
  // so the multi-child + Pressable + function-style combination wasn't
  // exercised. Putting flex on a plain View sidesteps the issue entirely.
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 8,
            paddingHorizontal: 10,
            // 12px corner radius — extracted from the design HTML
            // (border-top/bottom-{left,right}-radius: 12px).
            borderRadius: 12,
            backgroundColor: PC.bg,
            // Spacing lives on this inner View (not the outer Pressable):
            // putting marginTop on Pressable produced no visible gap in
            // RN 0.81, while margin on a plain View is rock-solid (same
            // pattern DrillRow uses for its own card spacing).
            marginTop: 10,
          },
          stickerShadow,
        ]}
      >
        {/* Thumbnail tile — 56x42 dark slab from the mock, replaced by the
            real thumbnail image when the lesson has one. */}
        <View
          style={{
            width: 56,
            height: 42,
            backgroundColor: '#0C1C22',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={{ width: 56, height: 42 }}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ color: '#FFFFFF', fontSize: 12, marginLeft: 2 }}>▶</Text>
          )}
        </View>

        {/* Text column — flex:1 takes whatever horizontal space is left
            between the thumbnail and the arrow. */}
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              color: PC.mute,
              fontSize: 11,
              fontWeight: '400',
              letterSpacing: 0.66,
              lineHeight: 14.5,
            }}
          >
            {label}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              color: PC.ink,
              fontSize: 13,
              fontWeight: '600',
              lineHeight: 15,
              marginTop: 1,
            }}
          >
            {title}
          </Text>
        </View>

        {/* Trailing play arrow — teal, matches the design's accent color. */}
        <Text style={{ color: PC.teal, fontSize: 14, fontWeight: '700' }}>▸</Text>
      </View>
    </Pressable>
  );
}
