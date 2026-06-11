import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

type ChatInputProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  };

  const canSend = !disabled && value.trim().length > 0;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F5F0EA',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.06)',
        gap: 10,
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
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 24,
          backgroundColor: '#FFFFFF',
          color: '#0B1416',
          fontSize: 15,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.08)',
        }}
      />
      <Pressable
        onPress={submit}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: canSend ? '#0F4C5C' : '#D1D5DB',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: -1 }}>↑</Text>
      </Pressable>
    </View>
  );
}
