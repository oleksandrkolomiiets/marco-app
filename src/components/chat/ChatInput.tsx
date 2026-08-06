import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { DashedRule } from '@/components/ui/DashedRule';

type ChatInputProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
  /**
   * Text to drop into the composer, e.g. the question "Ask Marco about this"
   * opens a match log with. Applied once per distinct draft so it never
   * overwrites something the player is part-way through typing.
   */
  draft?: string;
};

export function ChatInput({ onSend, disabled, draft }: ChatInputProps) {
  const [value, setValue] = useState('');
  const appliedDraft = useRef<string | null>(null);

  useEffect(() => {
    if (!draft || appliedDraft.current === draft) return;
    appliedDraft.current = draft;
    setValue(draft);
  }, [draft]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  };

  const canSend = !disabled && value.trim().length > 0;

  return (
    <View style={{ backgroundColor: '#FAF8F5' }}>
      {/* Design separates the composer with a dashed rule; RN can't dash a
          top-only border, so it's drawn with SVG. */}
      <DashedRule color="#C7BFB2" />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 12,
          gap: 8,
        }}
      >
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="Message Marco..."
        placeholderTextColor="#9CA3AF"
        multiline
        style={{
          flex: 1,
          maxHeight: 120,
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: 19,
          backgroundColor: '#FFFFFF',
          color: '#1A2A30',
          fontSize: 14,
          borderWidth: 1.4,
          borderColor: '#C7BFB2',
        }}
      />
      <Pressable
        onPress={submit}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: '#0F4C5C',
          borderWidth: 1.4,
          borderColor: '#1A2A30',
          opacity: canSend ? 1 : 0.4,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: -1 }}>↑</Text>
        </Pressable>
      </View>
    </View>
  );
}
