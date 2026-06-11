import { Text, View } from 'react-native';

type Tone = 'teal' | 'orange' | 'gray' | 'success' | 'danger';

type BadgeProps = {
  label: string;
  tone?: Tone;
};

const tones: Record<Tone, { bg: string; text: string }> = {
  teal: { bg: 'bg-marco-teal-50', text: 'text-marco-teal' },
  orange: { bg: 'bg-marco-orange-50', text: 'text-marco-orange' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-700' },
  success: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  danger: { bg: 'bg-red-50', text: 'text-red-700' },
};

export function Badge({ label, tone = 'gray' }: BadgeProps) {
  const { bg, text } = tones[tone];
  return (
    <View className={`self-start px-2 py-1 rounded-full ${bg}`}>
      <Text className={`text-xs font-medium ${text}`}>{label}</Text>
    </View>
  );
}
