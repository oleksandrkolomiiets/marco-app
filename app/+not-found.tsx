import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-2xl font-bold text-marco-teal-700 mb-2">404</Text>
        <Text className="text-base text-gray-600 mb-6 text-center">
          We couldn&apos;t find the screen you&apos;re looking for.
        </Text>
        <Link href="/" className="text-marco-orange font-semibold">
          Go home
        </Link>
      </View>
    </>
  );
}
