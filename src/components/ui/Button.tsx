import { Pressable, Text, ActivityIndicator, type PressableProps } from 'react-native';
import { type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
};

const containerVariants: Record<Variant, string> = {
  primary: 'bg-marco-teal active:bg-marco-teal-600',
  secondary: 'bg-marco-orange active:bg-marco-orange-500',
  ghost: 'bg-transparent border border-marco-teal active:bg-marco-teal-50',
  danger: 'bg-red-500 active:bg-red-600',
};

const labelVariants: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-white',
  ghost: 'text-marco-teal',
  danger: 'text-white',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-2 rounded-md',
  md: 'px-4 py-3 rounded-lg',
  lg: 'px-6 py-4 rounded-xl',
};

const labelSizes: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading,
  leftIcon,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`flex-row items-center justify-center ${containerVariants[variant]} ${sizes[size]} ${isDisabled ? 'opacity-50' : ''}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? '#0F4C5C' : '#FFFFFF'} />
      ) : (
        <>
          {leftIcon ? <Text className="mr-2">{leftIcon}</Text> : null}
          <Text className={`font-semibold ${labelVariants[variant]} ${labelSizes[size]}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
