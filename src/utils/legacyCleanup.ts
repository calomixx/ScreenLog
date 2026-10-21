const CLEANUP_MARKER = 'screenlog_legacy_cleanup_v3';

const LEGACY_EXACT_KEYS = [
  'cinetrack_user_name_v1',
  'cinetrack_user_reviews_v1',
  'cinetrack_registered_users_v1',
  'cinetrack_active_user_v1',
  'cinetrack_offline_sync_queue_v1',
  'cinetrack_last_sync_timestamp',
  'cinetrack_media_items_v1',
  'cinetrack_title_overrides_v1',
  'screenlog_site_testimonials_v1',
];

const LEGACY_PREFIXES = [
  'cinetrack_user_reviews_',
  'cinetrack_session_',
  'cinetrack_users_',
];

export function cleanupLegacyStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(CLEANUP_MARKER) === 'done') return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (LEGACY_EXACT_KEYS.includes(key) || LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(CLEANUP_MARKER, 'done');
  } catch {
    // storage unavailable
  }
}
