import { useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { DashedBox } from '@/components/ui/DashedBox';
import {
  useDevices,
  useRevokeDevice,
  useRevokeOtherDevices,
} from '@/hooks/useDevices';
import type { ConnectedDevice } from '@/types/api';

const hardShadowSm = {
  shadowColor: '#1A2A30',
  shadowOffset: { width: 2, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 2,
} as const;

const COLORS = {
  bg: '#FAF8F5',
  card: '#FFFFFF',
  cream: '#FEFBF5',
  ink: '#1A2A30',
  mute: '#4A5560',
  stone: '#C7BFB2',
  teal: '#0F4C5C',
  orange: '#E36414',
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * last_seen_at only moves when a device refreshes its token, which happens
 * roughly every 15 minutes while the app is open. Anything fresher than that
 * is "now" — quoting minutes would imply a precision this doesn't have.
 */
function lastSeenLabel(iso: string, now: number): string {
  const elapsed = now - new Date(iso).getTime();
  if (Number.isNaN(elapsed)) return 'Unknown';
  if (elapsed < 20 * MINUTE) return 'Active now';
  if (elapsed < HOUR) return 'Active in the last hour';
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR);
    return `Active ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  const days = Math.floor(elapsed / DAY);
  if (days === 1) return 'Active yesterday';
  if (days < 30) return `Active ${days} days ago`;
  const months = Math.floor(days / 30);
  return `Active ${months} ${months === 1 ? 'month' : 'months'} ago`;
}

function signedInLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `Signed in ${d.getDate()} ${d.toLocaleString('en-GB', { month: 'short' })} ${d.getFullYear()}`;
}

// device_name is null whenever the client didn't report one — a session
// created before the app sent device headers, or a platform that has no name
// to give. Say that rather than inventing a device.
const displayName = (d: ConnectedDevice): string =>
  d.device_name?.trim() || 'Unnamed device';

const detailLine = (d: ConnectedDevice): string =>
  [d.platform?.trim(), d.app_version?.trim() && `App ${d.app_version.trim()}`]
    .filter(Boolean)
    .join(' · ');

export default function DevicesScreen() {
  const router = useRouter();
  const {
    data: devices = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useDevices();
  const revokeDevice = useRevokeDevice();
  const revokeOthers = useRevokeOtherDevices();
  // Pinned once per render pass so every row in a list measures against the
  // same instant.
  const [now] = useState(() => Date.now());

  const others = devices.filter((d) => !d.current);

  const confirmRevoke = (device: ConnectedDevice) => {
    const name = displayName(device);
    Alert.alert(
      device.current ? 'Sign out this device?' : `Sign out ${name}?`,
      device.current
        ? "You'll be signed out of Marco on this phone."
        : `${name} will have to sign in again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => revokeDevice.mutate(device.id),
        },
      ],
    );
  };

  const confirmRevokeOthers = () => {
    Alert.alert(
      'Sign out all other devices?',
      `${others.length} ${others.length === 1 ? 'device' : 'devices'} will have to sign in again. This one stays signed in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => revokeOthers.mutate(),
        },
      ],
    );
  };

  const busy = revokeDevice.isPending || revokeOthers.isPending;
  const actionError = revokeDevice.error ?? revokeOthers.error;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 14,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={{ fontSize: 24, color: COLORS.ink }}>←</Text>
        </Pressable>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontFamily: 'InstrumentSerif_400Regular',
            fontSize: 22,
            color: COLORS.ink,
          }}
        >
          Connected devices
        </Text>
        {/* Balances the back arrow so the title sits centred. */}
        <View style={{ width: 24 }} />
      </View>

      {/* A device that signs in while this screen is open won't appear on its
          own — the list only refetches on mount, and last_seen_at moves at
          most every 15 minutes. Pull to check. */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={COLORS.teal}
          />
        }
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: COLORS.cream,
            borderWidth: 1.4,
            borderColor: COLORS.ink,
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
            ...hardShadowSm,
          }}
        >
          <MarcoAvatar size={38} />
          <Text
            style={{
              flex: 1,
              fontFamily: 'Caveat_400Regular',
              fontSize: 17,
              lineHeight: 20,
              color: COLORS.orange,
            }}
          >
            &ldquo;See something you don&apos;t recognise? Sign it out.&rdquo;
          </Text>
        </View>

        {isLoading ? (
          <>
            <SkeletonCard height={84} />
            <SkeletonCard height={84} />
          </>
        ) : isError ? (
          <DashedBox radius={14} style={{ padding: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: COLORS.ink, textAlign: 'center' }}>
              Couldn&apos;t load your devices.
            </Text>
            <Pressable
              onPress={() => void refetch()}
              style={{
                marginTop: 12,
                backgroundColor: COLORS.ink,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                Try again
              </Text>
            </Pressable>
          </DashedBox>
        ) : (
          <>
            {devices.map((device) => (
              <DeviceRow
                key={device.id}
                device={device}
                now={now}
                busy={busy}
                onSignOut={() => confirmRevoke(device)}
              />
            ))}

            {actionError ? (
              <Text
                style={{
                  fontSize: 13,
                  color: COLORS.orange,
                  marginTop: 4,
                  marginBottom: 8,
                }}
              >
                {actionError instanceof Error
                  ? actionError.message
                  : "That didn't go through. Try again."}
              </Text>
            ) : null}

            {others.length > 0 ? (
              <Pressable
                onPress={confirmRevokeOthers}
                disabled={busy}
                style={{
                  marginTop: 12,
                  alignItems: 'center',
                  borderWidth: 1.4,
                  borderColor: COLORS.orange,
                  borderRadius: 12,
                  paddingVertical: 13,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.orange }}>
                  Sign out all other devices
                </Text>
              </Pressable>
            ) : null}

            {/* Not an error state — one device is the normal case. */}
            {devices.length === 1 ? (
              <Text
                style={{
                  fontSize: 13,
                  lineHeight: 18,
                  color: COLORS.mute,
                  textAlign: 'center',
                  marginTop: 14,
                }}
              >
                This is the only device signed in to your account.
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type DeviceRowProps = {
  device: ConnectedDevice;
  now: number;
  busy: boolean;
  onSignOut: () => void;
};

function DeviceRow({ device, now, busy, onSignOut }: DeviceRowProps) {
  const detail = detailLine(device);

  return (
    <View
      style={{
        backgroundColor: COLORS.card,
        borderWidth: 1.4,
        borderColor: COLORS.ink,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        ...hardShadowSm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text
          style={{ flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.ink }}
          numberOfLines={1}
        >
          {displayName(device)}
        </Text>
        {device.current ? (
          <View
            style={{
              backgroundColor: COLORS.teal,
              borderRadius: 5,
              paddingHorizontal: 7,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>
              THIS DEVICE
            </Text>
          </View>
        ) : null}
      </View>

      {detail ? (
        <Text
          style={{
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 11,
            color: COLORS.mute,
            marginTop: 4,
          }}
        >
          {detail}
        </Text>
      ) : null}

      <Text style={{ fontSize: 12, color: COLORS.mute, marginTop: 6 }}>
        {lastSeenLabel(device.last_seen_at, now)} · {signedInLabel(device.signed_in_at)}
      </Text>

      <Pressable
        onPress={onSignOut}
        disabled={busy}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Sign out ${displayName(device)}`}
        style={{
          alignSelf: 'flex-start',
          marginTop: 10,
          borderWidth: 1.2,
          borderColor: COLORS.stone,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 6,
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.orange }}>
          Sign out
        </Text>
      </Pressable>
    </View>
  );
}
