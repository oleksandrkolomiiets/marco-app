import { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateMatchPreparation } from '@/hooks/usePreparation';
import type { MatchPreparation } from '@/types/api';
import {
  preparationColors as C,
  preparationFonts as F,
  stickerShadow,
  stickerShadowSm,
} from './theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.86;

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated?: (r: MatchPreparation) => void;
};

export function CreatePreparationForm({ visible, onClose, onCreated }: Props) {
  const insets = useSafeAreaInsets();
  const create = useCreateMatchPreparation();

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('20:00');
  const [opponentsRaw, setOpponentsRaw] = useState('');
  const [partner, setPartner] = useState('');
  const [court, setCourt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setDate(defaultDate);
    setTime('20:00');
    setOpponentsRaw('');
    setPartner('');
    setCourt('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = () => {
    setError(null);
    const opponents = opponentsRaw
      .split(/[,&]/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (opponents.length > 3) {
      setError('At most 3 opponents');
      return;
    }
    const scheduledAt = combineDateTime(date, time);
    if (!scheduledAt) {
      setError('Date and time required (YYYY-MM-DD and HH:MM)');
      return;
    }
    create.mutate(
      {
        scheduled_at: scheduledAt,
        opponents,
        partner_name: partner.trim() || undefined,
        court: court.trim() || undefined,
      },
      {
        onSuccess: (r) => {
          reset();
          onCreated?.(r);
          onClose();
        },
        onError: (err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to create prep');
        },
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1 }}>
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: C.scrim }]}
          onPress={handleClose}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: SHEET_HEIGHT,
            backgroundColor: C.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: C.stone }} />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 24,
              paddingTop: 10,
            }}
          >
            <Text
              style={{
                fontFamily: F.mono,
                fontSize: 11,
                color: C.mute,
                letterSpacing: 0.9,
              }}
            >
              NEW PREP
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={{ fontSize: 22, color: C.ink }}>✕</Text>
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 24, marginTop: 8 }}>
            <Text
              style={{
                fontFamily: F.serif,
                fontSize: 26,
                color: C.ink,
                lineHeight: 30,
              }}
            >
              Build a queue.
            </Text>
            <Text style={{ fontFamily: F.hand, fontSize: 18, color: C.clay, marginTop: 2 }}>
              &quot;Tell Marco who you&apos;re playing.&quot;
            </Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}
          >
            <Field label="DATE (YYYY-MM-DD)">
              <Input value={date} onChangeText={setDate} placeholder="2026-05-20" />
            </Field>
            <Field label="TIME (HH:MM)">
              <Input value={time} onChangeText={setTime} placeholder="20:00" />
            </Field>
            <Field label="OPPONENTS (UP TO 3)">
              <Input
                value={opponentsRaw}
                onChangeText={setOpponentsRaw}
                placeholder="Lucia & Pablo"
              />
            </Field>
            <Field label="PARTNER (OPTIONAL)">
              <Input value={partner} onChangeText={setPartner} placeholder="Antonio" />
            </Field>
            <Field label="COURT (OPTIONAL)">
              <Input value={court} onChangeText={setCourt} placeholder="CT 3" />
            </Field>

            {error ? (
              <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.clay, marginTop: 8 }}>
                {error}
              </Text>
            ) : null}
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              paddingHorizontal: 24,
              paddingTop: 12,
              paddingBottom: insets.bottom + 16,
              borderTopWidth: 1,
              borderTopColor: C.inkSoft,
              backgroundColor: C.bg,
            }}
          >
            <Pressable
              onPress={handleClose}
              style={[
                {
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: C.ink,
                  backgroundColor: C.card,
                  alignItems: 'center',
                },
                stickerShadowSm,
              ]}
            >
              <Text style={{ color: C.ink, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={create.isPending}
              style={[
                {
                  flex: 1.2,
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: create.isPending ? '#7A8E96' : C.teal,
                  alignItems: 'center',
                },
                stickerShadow,
              ]}
            >
              {create.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                  Create prep
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ marginBottom: 14 }}>
    <Text
      style={{
        fontFamily: F.monoBold,
        fontSize: 10,
        color: C.ink,
        letterSpacing: 0.8,
        marginBottom: 6,
      }}
    >
      {label}
    </Text>
    {children}
  </View>
);

const Input = (props: React.ComponentProps<typeof TextInput>) => (
  <View
    style={[
      {
        borderWidth: 1,
        borderColor: C.ink,
        borderRadius: 12,
        backgroundColor: C.card,
        paddingHorizontal: 12,
        paddingVertical: 8,
      },
      stickerShadowSm,
    ]}
  >
    <TextInput
      placeholderTextColor={C.mute}
      autoCapitalize="none"
      {...props}
      style={[
        {
          fontSize: 14,
          color: C.ink,
          paddingVertical: 4,
        },
        props.style,
      ]}
    />
  </View>
);

const defaultDate = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
})();

function combineDateTime(date: string, time: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!dateMatch || !timeMatch) return null;
  const [, y, mo, d] = dateMatch;
  const [, hh, mm] = timeMatch;
  const dt = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(hh),
    Number(mm),
    0,
    0,
  );
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}
