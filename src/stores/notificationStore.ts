import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

// Preferences live on the device, not on the account. Marco's reminders are
// scheduled locally by the OS from data the app already holds, so a preference
// is a statement about this phone — you might want match reminders on the
// phone in your bag and nothing on the iPad at home. Syncing them to the
// server would let one device silence another's alarms.
const KEY = 'notification_prefs';

export type NotificationPrefs = {
  /** The evening before a match with a prep, and again two hours ahead. */
  matchReminders: boolean;
  /** A weekly nudge when nothing has been logged. */
  weeklyNudge: boolean;
};

export const DEFAULT_PREFS: NotificationPrefs = {
  matchReminders: true,
  weeklyNudge: false,
};

type NotificationState = {
  prefs: NotificationPrefs;
  /** False until the stored prefs have been read, so the UI can avoid
   *  rendering defaults and then visibly correcting itself. */
  isLoaded: boolean;
  setPref: <K extends keyof NotificationPrefs>(
    key: K,
    value: NotificationPrefs[K],
  ) => void;
  loadFromStorage: () => Promise<void>;
};

// A stored blob written by an older build can be missing keys, or be junk if
// something else wrote to the slot. Merge onto defaults and drop anything that
// isn't a boolean rather than letting `undefined` reach a Switch.
function parsePrefs(raw: string | null): NotificationPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFS;
    const record = parsed as Record<string, unknown>;
    return {
      matchReminders:
        typeof record.matchReminders === 'boolean'
          ? record.matchReminders
          : DEFAULT_PREFS.matchReminders,
      weeklyNudge:
        typeof record.weeklyNudge === 'boolean'
          ? record.weeklyNudge
          : DEFAULT_PREFS.weeklyNudge,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  prefs: DEFAULT_PREFS,
  isLoaded: false,

  setPref: (key, value) => {
    const prefs = { ...get().prefs, [key]: value };
    void SecureStore.setItemAsync(KEY, JSON.stringify(prefs));
    set({ prefs });
  },

  loadFromStorage: async () => {
    try {
      set({ prefs: parsePrefs(await SecureStore.getItemAsync(KEY)), isLoaded: true });
    } catch {
      // A read failure shouldn't wedge the screen on a spinner; defaults are
      // a usable answer.
      set({ prefs: DEFAULT_PREFS, isLoaded: true });
    }
  },
}));

export { parsePrefs as __parsePrefsForTest };
