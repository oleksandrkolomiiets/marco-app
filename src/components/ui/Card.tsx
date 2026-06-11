import { View, type ViewProps } from 'react-native';

type CardProps = ViewProps & {
  padded?: boolean;
};

export function Card({ padded = true, className, children, ...rest }: CardProps) {
  return (
    <View
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${padded ? 'p-4' : ''} ${className ?? ''}`}
      {...rest}
    >
      {children}
    </View>
  );
}
