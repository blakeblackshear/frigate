import { mutate } from "swr";
import { baseUrl } from "./baseUrl";

// Module-level flag to prevent multiple simultaneous redirects
// (eg, when multiple SWR queries fail with 401 at once, or when
// both ApiProvider and ProtectedRoute try to redirect)
let _isRedirectingToLogin = false;

// Remount hook registered by the app root so the whole provider tree can
// be recreated without a document navigation (see resetAppState).
let _resetAppState: (() => void) | null = null;

// Navigator registered by the router so login redirects use client-side
// navigation. Full document navigations from an installed PWA can open
// an out-of-scope browser overlay (Chrome Custom Tab / Safari view) on
// some platforms, so the login page must stay inside the SPA.
let _navigate: ((path: string) => void) | null = null;

// The full document URL of the login page, including any base path prefix.
const loginUrl = new URL("./login", baseUrl);

export function isRedirectingToLogin(): boolean {
  return _isRedirectingToLogin;
}

export function setRedirectingToLogin(value: boolean): void {
  _isRedirectingToLogin = value;
}

export function registerLoginNavigator(
  navigate: ((path: string) => void) | null,
): void {
  _navigate = navigate;
}

export function registerAppStateReset(reset: (() => void) | null): void {
  _resetAppState = reset;
}

/**
 * Reset the app to a freshly-loaded state without a document navigation.
 *
 * Clears all cached API data, navigates to the given route, and remounts
 * the provider tree so every context (auth, websocket, streaming) starts
 * over, mirroring what a full page load used to do. Installed PWAs can
 * open full document navigations in a browser overlay on some platforms,
 * so this is used wherever the app previously reloaded itself, such as
 * after a login or a backend restart. Falls back to a document navigation
 * if the app root has not registered its hooks yet.
 */
export function resetAppState(path: string = "/"): void {
  setRedirectingToLogin(false);

  if (_navigate && _resetAppState) {
    // Drop all cached API data, including cached errors, so nothing
    // from the previous session is reused after the remount.
    mutate(() => true, undefined, { revalidate: false });
    _navigate(path);
    _resetAppState();
    return;
  }

  window.location.href = baseUrl;
}

export function isOnLoginPage(): boolean {
  return window.location.pathname === loginUrl.pathname;
}

/**
 * Send the user to the login page after an authentication failure.
 *
 * Prefers client-side navigation so an installed PWA never leaves its
 * window. A location targeting anything other than Frigate's own login
 * page (eg, an external auth portal set by a reverse proxy) falls back
 * to a full document navigation.
 */
export function redirectToLogin(location?: string | null): void {
  if (_isRedirectingToLogin || isOnLoginPage()) {
    return;
  }

  // The auth backend can name a login location: Frigate's own backend
  // sends "/login" (it does not know about any base path prefix), while
  // a reverse proxy may point at an external auth portal. Resolve the
  // value like the browser would to tell the two apart.
  let target: URL;
  try {
    target = new URL(location || loginUrl, window.location.href);
  } catch {
    target = loginUrl;
  }
  const isInternalLogin =
    target.origin === loginUrl.origin &&
    (target.pathname === loginUrl.pathname || target.pathname === "/login");

  setRedirectingToLogin(true);

  if (isInternalLogin && _navigate) {
    _navigate("/login");
    return;
  }

  window.location.href = isInternalLogin ? loginUrl.href : target.href;
}
