// The side of notifications that talks to the OS. Kept apart from plan.ts so
// the timing rules can be tested without importing expo-notifications, whose
// module-level push-token auto-registration warns about remote push this app
// doesn't use.
import * as Notifications from 'expo-notifications';
import { buildPlan } from '@/notifications/plan';
import type { MatchPreparation } from '@/types/api';
import type { NotificationPrefs } from '@/stores/notificationStore';

/**
 * Replace everything pending with the plan for right now. Cancel-then-schedule
 * rather than diffing: the set is tiny, and a reconcile that can't drift is
 * worth more than the handful of syscalls it saves. The app schedules nothing
 * else, so cancelling all of its notifications only cancels Marco's.
 */
export async function reconcile(
  prefs: NotificationPrefs,
  preps: MatchPreparation[],
  now: Date = new Date(),
): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const plans = buildPlan(prefs, preps, now);
  for (const plan of plans) {
    await Notifications.scheduleNotificationAsync({
      content: { title: plan.title, body: plan.body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: plan.at,
      },
    });
  }

  if (prefs.weeklyNudge) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'How’s the padel going?',
        body: 'Log a match or run a drill — Marco will pick it up from there.',
        sound: true,
      },
      // Sunday at 10:00. WEEKLY repeats on its own, so it survives the app not
      // being opened, unlike a one-shot date trigger.
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // 1 = Sunday in expo-notifications' calendar triggers
        hour: 10,
        minute: 0,
      },
    });
  }

  return plans.length + (prefs.weeklyNudge ? 1 : 0);
}

/** Drop everything — used when permission is taken away. */
export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
