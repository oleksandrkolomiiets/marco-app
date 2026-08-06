import { Platform } from 'react-native';
import Constants from 'expo-constants';

// What the app tells the server about itself, so "Connected devices" has
// something to show besides a row of anonymous sessions. Sent as headers on
// every request rather than in sign-in bodies, because /auth/signin,
// /auth/signup, /auth/google and /auth/refresh all need to report the same
// three things and none of them should grow the same three fields.
export const DEVICE_HEADERS = {
  name: 'X-Device-Name',
  platform: 'X-Device-Platform',
  appVersion: 'X-App-Version',
} as const;

// "iOS" / "Android" rather than Platform.OS's lowercase 'ios', since this
// string is rendered as-is on the devices screen.
const osLabel = (): string => {
  if (Platform.OS === 'ios') return 'iOS';
  if (Platform.OS === 'android') return 'Android';
  return Platform.OS;
};

/**
 * Best-effort device description. Every field is optional on the server, so a
 * platform that reports nothing useful degrades to an unnamed device rather
 * than blocking sign-in.
 */
export function deviceHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  // Constants.deviceName is "Ana's iPhone" on a real device; on a simulator
  // it's the simulator's name. Absent on web.
  const name = Constants.deviceName?.trim();
  if (name) headers[DEVICE_HEADERS.name] = name;

  const version = Platform.Version;
  headers[DEVICE_HEADERS.platform] =
    version === undefined ? osLabel() : `${osLabel()} ${String(version)}`;

  const appVersion = Constants.expoConfig?.version?.trim();
  if (appVersion) headers[DEVICE_HEADERS.appVersion] = appVersion;

  return headers;
}
