const TOKEN_KEY = "exam-hunt-token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

import { clearSessionActivity, touchSessionActivity } from "./session";

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    touchSessionActivity();
  } catch {
    /* ignore */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    clearSessionActivity();
  } catch {
    /* ignore */
  }
}
