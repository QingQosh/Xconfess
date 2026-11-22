export interface PrivacySettings {
  isDiscoverable: boolean;
  canReceiveReplies: boolean;
  showReactions: boolean;
  dataProcessingConsent: boolean;
  contentWarningsCollapsed?: boolean;
}

export const PRIVACY_SETTING_KEYS: (keyof PrivacySettings)[] = [
  'isDiscoverable',
  'canReceiveReplies',
  'showReactions',
  'dataProcessingConsent',
  'contentWarningsCollapsed',
];

export const PRIVACY_SETTING_LABELS: Record<keyof PrivacySettings, string> = {
  isDiscoverable: 'Profile Discovery',
  canReceiveReplies: 'Allow Replies',
  showReactions: 'Show Reactions',
  dataProcessingConsent: 'Data Processing Consent',
  contentWarningsCollapsed: 'Collapse Sensitive Content Warnings',
};

export interface PrivacySettingFieldChange {
  key: keyof PrivacySettings;
  label: string;
  from: boolean;
  to: boolean;
}

export interface PrivacySettingsHistoryEntry {
  id: string;
  timestamp: string;
  changes: PrivacySettingFieldChange[];
  summary: string;
}

export const PRIVACY_HISTORY_STORAGE_KEY = 'xconfess_privacy_settings_history';
const MAX_PRIVACY_HISTORY_ENTRIES = 25;

export function mergePrivacySettingsAfterConflict(
  submitted: PrivacySettings,
  baseline: PrivacySettings,
  server: PrivacySettings,
): PrivacySettings {
  return Object.fromEntries(
    PRIVACY_SETTING_KEYS.map((key) => [
      key,
      submitted[key] !== baseline[key] ? submitted[key] : server[key],
    ]),
  ) as PrivacySettings;
}

export function diffPrivacySettings(
  previous: PrivacySettings,
  next: PrivacySettings,
): PrivacySettingFieldChange[] {
  const changes: PrivacySettingFieldChange[] = [];
  for (const key of PRIVACY_SETTING_KEYS) {
    const prevVal = previous[key];
    const nextVal = next[key];
    if (typeof prevVal === 'boolean' && typeof nextVal === 'boolean' && prevVal !== nextVal) {
      changes.push({
        key,
        label: PRIVACY_SETTING_LABELS[key] ?? String(key),
        from: prevVal,
        to: nextVal,
      });
    }
  }
  return changes;
}

export function createPrivacySettingsHistoryEntry(
  previous: PrivacySettings,
  next: PrivacySettings,
  timestamp = new Date().toISOString(),
): PrivacySettingsHistoryEntry | null {
  const changes = diffPrivacySettings(previous, next);
  if (changes.length === 0) {
    return null;
  }

  const summary = changes
    .map((change) => `${change.label}: ${change.from ? 'ON' : 'OFF'} → ${change.to ? 'ON' : 'OFF'}`)
    .join('; ');

  return {
    id: `privacy-change-${timestamp}-${changes.map((c) => c.key).join('-')}`,
    timestamp,
    changes,
    summary,
  };
}

export function loadPrivacySettingsHistory(): PrivacySettingsHistoryEntry[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(PRIVACY_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PrivacySettingsHistoryEntry =>
        Boolean(
          item &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.timestamp === 'string' &&
            Array.isArray(item.changes),
        ),
    );
  } catch {
    return [];
  }
}

export function appendPrivacySettingsHistory(
  previous: PrivacySettings,
  next: PrivacySettings,
  timestamp = new Date().toISOString(),
): PrivacySettingsHistoryEntry[] {
  const entry = createPrivacySettingsHistoryEntry(previous, next, timestamp);
  const existing = loadPrivacySettingsHistory();
  if (!entry) {
    return existing;
  }

  const updated = [entry, ...existing].slice(0, MAX_PRIVACY_HISTORY_ENTRIES);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(PRIVACY_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota errors
    }
  }
  return updated;
}

export function clearPrivacySettingsHistory(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(PRIVACY_HISTORY_STORAGE_KEY);
    } catch {
      // Ignore storage removal errors
    }
  }
}