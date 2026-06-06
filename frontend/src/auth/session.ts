/** Log out after 30 minutes without mouse/keyboard/touch activity. */
export const SESSION_IDLE_MS = 30 * 60 * 1000;

export function sessionIdleMinutes() {
  return Math.round(SESSION_IDLE_MS / 60_000);
}

const LAST_ACTIVITY_KEY = "exam-hunt-last-activity";

export function touchSessionActivity() {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function clearSessionActivity() {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    /* ignore */
  }
}

export function isSessionIdleExpired(): boolean {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!raw) return false;
    const last = Number(raw);
    if (!Number.isFinite(last)) return false;
    return Date.now() - last > SESSION_IDLE_MS;
  } catch {
    return false;
  }
}
