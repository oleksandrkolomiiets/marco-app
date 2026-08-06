import * as Notifications from 'expo-notifications';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

/**
 * Show a notification even when the app is in the foreground. Without this iOS
 * swallows it, which during testing looks exactly like a scheduling bug.
 * Registered once at module load, before any notification can arrive.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const toState = (
  status: Notifications.PermissionStatus,
  canAskAgain: boolean,
): PermissionState => {
  if (status === 'granted') return 'granted';
  // iOS reports "denied" both for a fresh install that has never asked and for
  // a real refusal. canAskAgain is what distinguishes them, and it decides
  // whether the UI offers a button or sends you to Settings.
  return canAskAgain ? 'undetermined' : 'denied';
};

export async function getPermission(): Promise<PermissionState> {
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  return toState(status, canAskAgain);
}

/** Ask, if iOS will still let us. Returns the state afterwards. */
export async function requestPermission(): Promise<PermissionState> {
  const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
  return toState(status, canAskAgain);
}
