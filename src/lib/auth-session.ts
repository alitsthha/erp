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

// Clear only data accessible to this application's origin. HttpOnly cookies
// must be expired by the server that set them.
export function clearBrowserSessionData(): void {
  for (const storageName of ["localStorage", "sessionStorage"] as const) {
    try {
      window[storageName].clear();
    } catch {
      // Storage may be disabled by browser privacy settings.
    }
  }

  const paths = new Set(["/"]);
  const segments = window.location.pathname.split("/").filter(Boolean);
  while (segments.length) {
    paths.add(`/${segments.join("/")}`);
    paths.add(`/${segments.join("/")}/`);
    segments.pop();
  }
  const domains = [""];
  const hostnameParts = window.location.hostname.split(".");
  while (hostnameParts.length > 1) {
    domains.push(hostnameParts.join("."));
    hostnameParts.shift();
  }
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (!name) continue;
    for (const path of paths) {
      for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; Path=${path}${domain ? `; Domain=${domain}` : ""}`;
      }
    }
  }
}
