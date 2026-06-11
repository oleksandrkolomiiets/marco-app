import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import { stripStreamingTokens } from './marcoTokens';

type StreamingBubbleProps = {
  /** Mutable ref the chat screen appends streamed SSE chunks into. */
  source: { current: string };
};

// The in-progress assistant bubble with the typewriter effect. It owns the
// 16ms interval and the displayed-text state, so the per-tick re-render is
// confined to this bubble — the chat screen and its FlatList re-render only
// when streaming starts/stops, not ~60×/second while Marco types.
export function StreamingBubble({ source }: StreamingBubbleProps) {
  const [displayText, setDisplayText] = useState('');

  // Typewriter: advance toward the cleaned accumulated text at a capped pace
  // so large XHR chunks still appear character by character. Tokens are
  // stripped BEFORE slicing — stripping the displayed slice instead would
  // type the raw "[LESSON_REF:" keyword out and then yank it back once the
  // strip pattern finally matches.
  useEffect(() => {
    let displayLen = 0;
    const id = setInterval(() => {
      const target = stripStreamingTokens(source.current).trimStart();
      if (displayLen >= target.length) return;
      const remaining = target.length - displayLen;
      const step = remaining > 60 ? 4 : remaining > 15 ? 2 : 1;
      displayLen = Math.min(displayLen + step, target.length);
      setDisplayText(target.slice(0, displayLen));
    }, 16);
    return () => clearInterval(id);
  }, [source]);

  return (
    <View style={{ marginBottom: 4, flexDirection: 'row', alignItems: 'flex-end' }}>
      <View style={{ width: 32, marginRight: 8 }}>
        <MarcoAvatar size={32} />
      </View>
      <View
        style={{
          maxWidth: '75%',
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
        {displayText ? (
          <Text style={{ color: '#0B1416', fontSize: 15, lineHeight: 22 }}>
            {displayText}
          </Text>
        ) : (
          <TypingDots />
        )}
      </View>
    </View>
  );
}

function TypingDots() {
  return (
    <View style={{ flexDirection: 'row', gap: 4, paddingVertical: 2 }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#9CA3AF',
            opacity: 0.7,
          }}
        />
      ))}
    </View>
  );
}
