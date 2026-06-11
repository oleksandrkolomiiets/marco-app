import { Pressable, Text, View } from 'react-native';

type ErrorBannerProps = {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
};

export const ErrorBanner = ({ message, onRetry, onDismiss }: ErrorBannerProps) => (
  <View className="flex-row items-center gap-2 mx-4 my-2 px-3 py-3 rounded-xl bg-red-50">
    <Text className="flex-1 text-[13px] leading-[18px] text-red-600">{message}</Text>
    {onRetry ? (
      <Pressable onPress={onRetry} hitSlop={8}>
        <Text className="text-[13px] font-semibold text-red-600">Retry</Text>
      </Pressable>
    ) : null}
    {onDismiss ? (
      <Pressable
        onPress={onDismiss}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Text className="text-base font-semibold text-red-600">×</Text>
      </Pressable>
    ) : null}
  </View>
);
