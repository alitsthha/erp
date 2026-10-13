export const SESSION_DURATION_MS = 30 * 60 * 1000;

export function getSessionExpiresAt(authTime: string): number {
  const signedInAt = Date.parse(authTime);
  return Number.isFinite(signedInAt) ? signedInAt + SESSION_DURATION_MS : 0;
}

// Use the original authentication time, so refreshes cannot extend the session.
export function watchSessionExpiry(expiresAt: number, onExpire: () => void): () => void {
  let timer: number | undefined;
  let stopped = false;

  const stop = () => {
    stopped = true;
    window.clearTimeout(timer);
    window.removeEventListener("focus", check);
    window.removeEventListener("pageshow", check);
    document.removeEventListener("visibilitychange", check);
  };

  const check = () => {
    if (stopped) return;
    window.clearTimeout(timer);
    const remaining = expiresAt - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) {
      stop();
      onExpire();
      return;
    }
    timer = window.setTimeout(check, remaining);
  };

  // Recheck immediately when returning from a sleeping or backgrounded browser.
  window.addEventListener("focus", check);
  window.addEventListener("pageshow", check);
  document.addEventListener("visibilitychange", check);
  check();
  return stop;
}
