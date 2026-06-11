import { Text, View } from 'react-native';

type ProgressBarProps = {
  current: number;
  total: number;
  showLabel?: boolean;
};

export const ProgressBar = ({ current, total, showLabel = false }: ProgressBarProps) => {
  const percent = total > 0 ? Math.min((current / total) * 100, 100) : 0;

  return (
    <View>
      {showLabel ? (
        <Text className="text-xs text-gray-500 mb-1.5">
          {current} of {total}
        </Text>
      ) : null}
      <View className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <View
          className="h-1.5 bg-marco-teal rounded-full"
          style={{ width: `${percent}%` }}
        />
      </View>
    </View>
  );
};
