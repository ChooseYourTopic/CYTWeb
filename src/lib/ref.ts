// Affiliate referral capture. When someone lands via ?ref=CYT-AF-000123 we stash
// the code so it can be attributed when they sign up (however long later).

const KEY = "cyt_ref";
const RE = /^CYT-AF-\d{4,}$/i;

/** Read ?ref= from the current URL and persist it (localStorage + cookie). */
export function captureRefFromUrl(): void {
  if (typeof window === "undefined") return;
  const raw = new URLSearchParams(window.location.search).get("ref");
  if (!raw || !RE.test(raw)) return;
  const ref = raw.toUpperCase();
  try {
    localStorage.setItem(KEY, ref);
  } catch {
    /* ignore */
  }
  document.cookie = `${KEY}=${encodeURIComponent(ref)};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`;
}

/** The stored referral code, if any. */
export function getRef(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const v = localStorage.getItem(KEY);
    if (v) return v;
  } catch {
    /* ignore */
  }
  const m = document.cookie.match(/(?:^|;\s*)cyt_ref=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}
