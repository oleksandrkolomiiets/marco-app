import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchLog } from '@/types/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.86;

const COLORS = {
  bg: '#FAFAF8',
  ink: '#0B1416',
  mute: '#4A5560',
  border: '#E5E7EB',
  teal: '#0F4C5C',
  orange: '#E36414',
  card: '#FFFFFF',
  white: '#FFFFFF',
};

const WEEKDAY_LONG = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];
const MONTH_LONG = [
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

const formatLongDate = (iso: string): string => {
  const d = new Date(iso);
  const wd = WEEKDAY_LONG[d.getUTCDay()] ?? '';
  const day = d.getUTCDate();
  const mo = MONTH_LONG[d.getUTCMonth()] ?? '';
  return `${wd} ${day} ${mo}`;
};

const titleFromResult = (result: string | null): string => {
  if (result === 'won') return 'Won';
  if (result === 'lost') return 'Lost';
  if (result === 'draw') return 'Draw';
  return 'Played';
};

const FEELING_LABEL: Record<string, string> = {
  frustrated: 'Felt frustrated',
  meh: 'Felt meh',
  good: 'Felt good',
  'on fire': 'On fire',
  tired: 'Felt tired',
};

type Props = {
  match: MatchLog | null;
  matchNumber: number | null;
  isUsualPartner: boolean;
  onClose: () => void;
  onAskMarco: () => void;
  onEdit: () => void;
};

export function MatchDetailSheet({
  match,
  matchNumber,
  isUsualPartner,
  onClose,
  onAskMarco,
  onEdit,
}: Props) {
  const insets = useSafeAreaInsets();
  const visible = match !== null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
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
            height: SHEET_HEIGHT,
            backgroundColor: COLORS.bg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 20,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View
              style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB' }}
            />
          </View>

          {match ? (
            <SheetBody
              match={match}
              matchNumber={matchNumber}
              isUsualPartner={isUsualPartner}
              onClose={onClose}
              onAskMarco={onAskMarco}
              onEdit={onEdit}
              bottomInset={insets.bottom}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

type SheetBodyProps = {
  match: MatchLog;
  matchNumber: number | null;
  isUsualPartner: boolean;
  onClose: () => void;
  onAskMarco: () => void;
  onEdit: () => void;
  bottomInset: number;
};

function SheetBody({
  match,
  matchNumber,
  isUsualPartner,
  onClose,
  onAskMarco,
  onEdit,
  bottomInset,
}: SheetBodyProps) {
  const isWin = match.result === 'won';
  const isLoss = match.result === 'lost';
  const badge = isWin ? 'W' : isLoss ? 'L' : '—';
  const badgeColor = isWin ? COLORS.teal : isLoss ? COLORS.orange : COLORS.mute;
  const resultWord = titleFromResult(match.result);
  const score = match.note?.trim() ?? '';
  const headline = score ? `${resultWord} · ${score}` : resultWord;

  const opponents = match.opponents.filter((o) => o.trim().length > 0);
  const feelingLabel = match.feeling ? FEELING_LABEL[match.feeling] ?? match.feeling : null;
  const noteLine = score ? null : match.note?.trim() ?? null;
  const howItWentParts: string[] = [];
  if (feelingLabel) howItWentParts.push(feelingLabel);
  if (noteLine) howItWentParts.push(noteLine);

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: 4,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            color: COLORS.mute,
            letterSpacing: 1,
          }}
        >
          MATCH LOG{matchNumber !== null ? ` · #${String(matchNumber).padStart(3, '0')}` : ''}
        </Text>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text style={{ fontSize: 20, color: COLORS.mute }}>×</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            marginTop: 12,
            marginBottom: 18,
          }}
        >
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 14,
              backgroundColor: badgeColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'InstrumentSerif_400Regular',
                fontSize: 30,
                color: COLORS.white,
                fontWeight: '700',
              }}
            >
              {badge}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'InstrumentSerif_400Regular',
                fontSize: 26,
                fontWeight: '700',
                color: COLORS.ink,
              }}
              numberOfLines={1}
            >
              {headline}
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.mute, marginTop: 4 }}>
              {formatLongDate(match.played_on)}
            </Text>
          </View>
        </View>

        <NumberedCard
          n={1}
          label="RESULT"
          title={headline}
          subtitle={formatLongDate(match.played_on)}
        />

        <NumberedCard
          n={2}
          label="PARTNER"
          title={match.partner_name?.trim() || 'Solo'}
          subtitle={
            match.partner_name && isUsualPartner ? 'Usual partner' : undefined
          }
        />

        <NumberedCard
          n={3}
          label="OPPONENTS"
          title={opponents.length > 0 ? opponents.join(' & ') : 'Not recorded'}
        />

        {howItWentParts.length > 0 ? (
          <NumberedCard
            n={4}
            label="HOW IT WENT"
            title={howItWentParts.join(' · ')}
          />
        ) : null}
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: bottomInset + 16,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.bg,
        }}
      >
        <Pressable
          onPress={onEdit}
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: COLORS.border,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: COLORS.ink, fontWeight: '700', fontSize: 15 }}>
            Edit log
          </Text>
        </Pressable>
        <Pressable
          onPress={onAskMarco}
          style={{
            flex: 1.4,
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: COLORS.teal,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 15 }}>
            Ask Marco about this
          </Text>
        </Pressable>
      </View>
    </>
  );
}

type NumberedCardProps = {
  n: number;
  label: string;
  title: string;
  subtitle?: string;
};

const NumberedCard = ({ n, label, title, subtitle }: NumberedCardProps) => (
  <View
    style={{
      flexDirection: 'row',
      gap: 12,
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
    }}
  >
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.ink }}>{n}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: COLORS.mute,
          letterSpacing: 1,
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.ink }}>{title}</Text>
      {subtitle ? (
        <Text style={{ fontSize: 12, color: COLORS.mute, marginTop: 2 }}>{subtitle}</Text>
      ) : null}
    </View>
  </View>
);
