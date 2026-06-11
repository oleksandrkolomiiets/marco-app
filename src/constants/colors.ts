export const colors = {
  teal: '#0F4C5C',
  tealDark: '#093039',
  tealLight: '#4D848F',
  orange: '#E36414',
  orangeDark: '#9E450D',
  orangeLight: '#EE8843',
  background: '#FFFFFF',
  surface: '#F7F7F8',
  border: '#E5E7EB',
  text: '#0B1416',
  textMuted: '#6B7280',
  success: '#10B981',
  danger: '#EF4444',
} as const;

export type ColorKey = keyof typeof colors;
