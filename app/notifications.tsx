import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import { DashedRule } from '@/components/ui/DashedRule';
import { useMatchPreparation } from '@/hooks/usePreparation';
import {
  useNotificationStore,
  type NotificationPrefs,
} from '@/stores/notificationStore';
import { getPermission, requestPermission, type PermissionState } from '@/notifications/permission';
import { buildPlan } from '@/notifications/plan';
import { cancelAll, reconcile } from '@/notifications/schedule';

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

type Toggle = {
  key: keyof NotificationPrefs;
  label: string;
  detail: string;
};

const TOGGLES: Toggle[] = [
  {
    key: 'matchReminders',
    label: 'Match reminders',
    detail:
      'The evening before a planned match, and again two hours ahead, with what’s left in your queue.',
  },
  {
    key: 'weeklyNudge',
    label: 'Weekly nudge',
    detail: 'A Sunday-morning reminder to log what you played.',
  },
];

const formatWhen = (d: Date): string =>
  `${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export default function NotificationsScreen() {
  const router = useRouter();
  const { prefs, isLoaded, setPref, loadFromStorage } = useNotificationStore();
  const { data: preps = [] } = useMatchPreparation();
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [scheduleFailed, setScheduleFailed] = useState(false);
  const [now] = useState(() => new Date());

  useEffect(() => {
    if (!isLoaded) void loadFromStorage();
  }, [isLoaded, loadFromStorage]);

  useEffect(() => {
    void getPermission().then(setPermission);
  }, []);

  const granted = permission === 'granted';

  // Whatever the toggles and the prep list currently say should be pending,
  // gets scheduled. Runs on every relevant change rather than only on toggle,
  // because adding a drill or moving a match changes what the alerts should
  // say — the queue count is baked into the body text at schedule time.
  useEffect(() => {
    if (!isLoaded || permission === null) return;
    if (!granted) {
      cancelAll().catch(() => setScheduleFailed(true));
      return;
    }
    // Not fire-and-forget: if the OS refuses the schedule, the list below
    // would still show exactly what was supposed to be pending and nothing
    // would ever arrive. Say so instead.
    setScheduleFailed(false);
    reconcile(prefs, preps).catch(() => setScheduleFailed(true));
  }, [granted, isLoaded, permission, prefs, preps]);

  const handleEnable = useCallback(async () => {
    const next = await requestPermission();
    setPermission(next);
  }, []);

  // Shown so the screen can be honest about what is actually pending, rather
  // than implying a reminder exists for a match nobody has planned.
  const planned = granted && isLoaded ? buildPlan(prefs, preps, now) : [];

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
          Notifications
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
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
            &ldquo;I&apos;ll only interrupt you about a match you&apos;ve planned.&rdquo;
          </Text>
        </View>

        {permission === null ? null : granted ? null : (
          <PermissionCard state={permission} onEnable={() => void handleEnable()} />
        )}

        <View
          style={{
            backgroundColor: COLORS.card,
            borderWidth: 1.4,
            borderColor: COLORS.ink,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 4,
            ...hardShadowSm,
          }}
        >
          {TOGGLES.map((toggle, i) => (
            <View key={toggle.key}>
              {i > 0 ? <DashedRule color={COLORS.stone} marginTop={0} marginBottom={0} /> : null}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 14,
                  // The toggles do nothing without permission; dimming them
                  // says so without hiding what Marco would send.
                  opacity: granted ? 1 : 0.45,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.ink }}>
                    {toggle.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12.5,
                      lineHeight: 17,
                      color: COLORS.mute,
                      marginTop: 3,
                    }}
                  >
                    {toggle.detail}
                  </Text>
                </View>
                <Switch
                  value={prefs[toggle.key]}
                  onValueChange={(v) => setPref(toggle.key, v)}
                  disabled={!granted || !isLoaded}
                  trackColor={{ true: COLORS.teal, false: COLORS.stone }}
                  accessibilityLabel={toggle.label}
                />
              </View>
            </View>
          ))}
        </View>

        {scheduleFailed ? (
          <Text
            style={{
              fontSize: 13,
              lineHeight: 18,
              color: COLORS.orange,
              marginTop: 12,
            }}
          >
            Couldn&apos;t hand these to iOS just now, so nothing is actually
            queued. Reopen this screen to try again.
          </Text>
        ) : null}

        {granted && !scheduleFailed ? (
          <UpcomingList planned={planned} prefs={prefs} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PermissionCard({
  state,
  onEnable,
}: {
  state: PermissionState;
  onEnable: () => void;
}) {
  // Once iOS has been told no, the app cannot ask again — only Settings can
  // change it. Offering a button that silently does nothing would be worse
  // than sending them to the right place.
  const blocked = state === 'denied';

  return (
    <View
      style={{
        backgroundColor: COLORS.card,
        borderWidth: 1.4,
        borderColor: COLORS.orange,
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
        ...hardShadowSm,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.ink }}>
        {blocked ? 'Notifications are off for Marco' : 'Turn on notifications'}
      </Text>
      <Text style={{ fontSize: 13, lineHeight: 18, color: COLORS.mute, marginTop: 4 }}>
        {blocked
          ? 'iOS is blocking them. You can switch them back on in Settings.'
          : 'Marco needs your permission before he can remind you about anything.'}
      </Text>
      <Pressable
        onPress={blocked ? () => void Linking.openSettings() : onEnable}
        style={{
          alignSelf: 'flex-start',
          marginTop: 12,
          backgroundColor: COLORS.ink,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 9,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
          {blocked ? 'Open Settings' : 'Allow notifications'}
        </Text>
      </Pressable>
    </View>
  );
}

function UpcomingList({
  planned,
  prefs,
}: {
  planned: ReturnType<typeof buildPlan>;
  prefs: NotificationPrefs;
}) {
  const nothingOn = !prefs.matchReminders && !prefs.weeklyNudge;

  return (
    <View style={{ marginTop: 20 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1.1,
          color: COLORS.mute,
          marginBottom: 8,
        }}
      >
        WHAT&apos;S QUEUED
      </Text>

      {nothingOn ? (
        <Text style={{ fontSize: 13, lineHeight: 18, color: COLORS.mute }}>
          Nothing — both reminders are off.
        </Text>
      ) : planned.length === 0 ? (
        <Text style={{ fontSize: 13, lineHeight: 18, color: COLORS.mute }}>
          {prefs.matchReminders
            ? 'No match reminders yet — plan a match and they’ll appear here.'
            : 'The weekly nudge is on. It arrives on Sunday mornings.'}
        </Text>
      ) : (
        planned.map((plan) => (
          <View
            key={`${plan.at.toISOString()}-${plan.title}`}
            style={{
              backgroundColor: COLORS.card,
              borderWidth: 1,
              borderColor: COLORS.stone,
              borderRadius: 10,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 10.5,
                color: COLORS.orange,
              }}
            >
              {formatWhen(plan.at)}
            </Text>
            <Text
              style={{ fontSize: 14, fontWeight: '600', color: COLORS.ink, marginTop: 3 }}
            >
              {plan.title}
            </Text>
            <Text style={{ fontSize: 12.5, color: COLORS.mute, marginTop: 2 }}>
              {plan.body}
            </Text>
          </View>
        ))
      )}

      {prefs.weeklyNudge ? (
        <Text style={{ fontSize: 12, color: COLORS.mute, marginTop: 6 }}>
          Plus the weekly nudge, every Sunday at 10:00.
        </Text>
      ) : null}
    </View>
  );
}
