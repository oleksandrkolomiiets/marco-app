import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Achievement, AchievementAccent } from '@/types/api';

const COLORS = {
  bg: '#FAF8F5',
  ink: '#1A2A30',
  mute: '#4A5560',
  teal: '#0F4C5C',
  orange: '#E36414',
  card: '#FFFFFF',
  white: '#FFFFFF',
  handle: '#C7BFB2',
};

const ACCENT_BG: Record<AchievementAccent, string> = {
  teal: COLORS.teal,
  orange: COLORS.orange,
  ink: COLORS.ink,
};

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const formatEarnedDate = (iso: string): string => {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS[d.getUTCMonth()] ?? '';
  return `${day} ${month} ${d.getUTCFullYear()}`;
};

type Props = {
  achievement: Achievement | null;
  onClose: () => void;
};

export function AchievementDetailSheet({ achievement, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const visible = achievement !== null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        {/* Scrim — matches design's rgba(20,28,32,0.55) */}
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(20,28,32,0.55)' }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: '92%',
            backgroundColor: COLORS.bg,
            paddingTop: 10,
            paddingBottom: 22 + insets.bottom,
            // Sharp dark top rail — design uses box-shadow 0 -4px to draw it.
            borderTopWidth: 4,
            borderTopColor: COLORS.ink,
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingBottom: 6,
            }}
          >
            <View
              style={{ width: 44, height: 4, backgroundColor: COLORS.handle }}
            />
          </View>

          {achievement ? <SheetBody achievement={achievement} onClose={onClose} /> : null}
        </View>
      </View>
    </Modal>
  );
}

type SheetBodyProps = {
  achievement: Achievement;
  onClose: () => void;
};

function SheetBody({ achievement, onClose }: SheetBodyProps) {
  const { unlocked, icon, title, description, criteria, progress_label, unlocked_at, accent } =
    achievement;

  const tileBg = unlocked ? ACCENT_BG[accent] : COLORS.card;

  return (
    <>
      {/* Eyebrow + close */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 2,
          paddingBottom: 10,
          paddingHorizontal: 20,
        }}
      >
        <Text
          style={{
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
            letterSpacing: 0.88,
            color: COLORS.mute,
          }}
        >
          ACHIEVEMENT · {unlocked ? 'UNLOCKED' : 'LOCKED'}
        </Text>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text style={{ fontSize: 22, lineHeight: 22, color: COLORS.ink }}>✕</Text>
        </Pressable>
      </View>

      {/* Hero — badge + title row, horizontal */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 4,
          paddingBottom: 14,
          paddingHorizontal: 22,
          gap: 16,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            backgroundColor: tileBg,
            opacity: unlocked ? 1 : 0.55,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: COLORS.ink,
            shadowOffset: unlocked ? { width: 3, height: 3 } : { width: 0, height: 0 },
            shadowOpacity: unlocked ? 1 : 0,
            shadowRadius: 0,
            elevation: 0,
          }}
        >
          <Text
            style={{
              fontFamily: 'InstrumentSerif_400Regular',
              fontSize: 38,
              lineHeight: 38,
              color: unlocked ? COLORS.white : COLORS.mute,
            }}
          >
            {icon}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: 'InstrumentSerif_400Regular',
              fontSize: 24,
              lineHeight: 25.2,
              letterSpacing: -0.48,
              color: COLORS.ink,
            }}
          >
            {title}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 6,
              gap: 8,
            }}
          >
            <View
              style={{
                backgroundColor: unlocked ? COLORS.teal : COLORS.mute,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  color: COLORS.white,
                }}
              >
                {unlocked ? 'Earned' : 'Locked'}
              </Text>
            </View>
            {unlocked && unlocked_at ? (
              <Text
                style={{
                  fontFamily: 'JetBrainsMono_400Regular',
                  fontSize: 11,
                  color: COLORS.mute,
                }}
              >
                {formatEarnedDate(unlocked_at)}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Description */}
      <View style={{ paddingHorizontal: 22, paddingBottom: 12 }}>
        <Text style={{ fontSize: 14, lineHeight: 19.6, color: COLORS.ink }}>{description}</Text>
      </View>

      {/* Cards */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 2 }}>
        <DetailCard label="How to earn" body={criteria} />
        <DetailCard label="Your progress" body={progress_label} mono />
      </View>
    </>
  );
}

type DetailCardProps = {
  label: string;
  body: string;
  mono?: boolean;
};

const DetailCard = ({ label, body, mono = false }: DetailCardProps) => (
  <View
    style={{
      backgroundColor: COLORS.card,
      paddingHorizontal: 12,
      paddingVertical: 9,
    }}
  >
    <Text
      style={{
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: COLORS.mute,
      }}
    >
      {label}
    </Text>
    <Text
      style={{
        fontFamily: mono ? 'JetBrainsMono_400Regular' : undefined,
        fontSize: 13,
        lineHeight: mono ? 17.5 : 16.9,
        letterSpacing: mono ? 0.26 : 0,
        color: COLORS.ink,
        marginTop: 2,
      }}
    >
      {body}
    </Text>
  </View>
);
