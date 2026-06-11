import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue } from 'react-native';

type SkeletonCardProps = {
  width?: DimensionValue;
  height?: number;
};

export const SkeletonCard = ({ width = '100%', height = 72 }: SkeletonCardProps) => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      className="bg-gray-200 rounded-xl mb-3"
      style={{ opacity, width, height }}
    />
  );
};
