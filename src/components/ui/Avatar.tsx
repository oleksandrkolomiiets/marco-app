import { Image, Text, View } from 'react-native';

type Size = 'sm' | 'md' | 'lg' | 'xl';

type AvatarProps = {
  uri?: string | null;
  name?: string;
  size?: Size;
};

const sizes: Record<Size, { box: string; text: string }> = {
  sm: { box: 'w-8 h-8', text: 'text-xs' },
  md: { box: 'w-12 h-12', text: 'text-base' },
  lg: { box: 'w-16 h-16', text: 'text-lg' },
  xl: { box: 'w-24 h-24', text: 'text-2xl' },
};

function initials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export function Avatar({ uri, name, size = 'md' }: AvatarProps) {
  const { box, text } = sizes[size];
  return (
    <View className={`${box} rounded-full bg-marco-teal items-center justify-center overflow-hidden`}>
      {uri ? (
        <Image source={{ uri }} className="w-full h-full" />
      ) : (
        <Text className={`text-white font-semibold ${text}`}>{initials(name)}</Text>
      )}
    </View>
  );
}
