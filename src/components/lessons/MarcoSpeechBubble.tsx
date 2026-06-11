import { Text, View } from 'react-native';

type MarcoSpeechBubbleProps = {
  title: string;
};

export const MarcoSpeechBubble = ({ title }: MarcoSpeechBubbleProps) => (
  <View
    style={{
      backgroundColor: '#fff',
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      maxWidth: 180,
    }}
  >
    <View
      style={{
        position: 'absolute',
        left: -7,
        top: 14,
        width: 0,
        height: 0,
        borderTopWidth: 6,
        borderBottomWidth: 6,
        borderRightWidth: 7,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderRightColor: '#fff',
      }}
    />
    <Text
      numberOfLines={2}
      style={{ fontSize: 12, fontWeight: '700', color: '#1A1A1A' }}
    >
      {title}
    </Text>
    <Text style={{ fontSize: 11, color: '#E36414', marginTop: 2 }}>
      Tap to start ↑
    </Text>
  </View>
);
