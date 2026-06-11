import { Modal, Pressable, Text } from 'react-native';

type LockedBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export const LockedBottomSheet = ({ visible, onClose }: LockedBottomSheetProps) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <Pressable
      onPress={onClose}
      style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
      }}
    >
      <Pressable
        onPress={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          backgroundColor: '#fff',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: 24,
          paddingTop: 20,
          paddingBottom: 40,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 28, marginBottom: 10 }}>🔒</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1A1A' }}>
          Premium lesson
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: '#8B8B8B',
            textAlign: 'center',
            marginTop: 8,
            lineHeight: 20,
          }}
        >
          Upgrade to unlock all lessons and train with Marco every step of the way.
        </Text>

        <Pressable
          onPress={onClose}
          style={{
            marginTop: 24,
            width: '100%',
            height: 52,
            backgroundColor: '#0F4C5C',
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
            See plans
          </Text>
        </Pressable>

        <Pressable onPress={onClose} style={{ marginTop: 14 }}>
          <Text style={{ fontSize: 14, color: '#8B8B8B' }}>Maybe later</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  </Modal>
);
