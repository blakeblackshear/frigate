import { baseUrl } from "./baseUrl";

// Module-level flag to prevent multiple simultaneous redirects
// (eg, when multiple SWR queries fail with 401 at once, or when
// both ApiProvider and ProtectedRoute try to redirect)
let _isRedirectingToLogin = false;

export function isRedirectingToLogin(): boolean {
  return _isRedirectingToLogin;
}

export function setRedirectingToLogin(value: boolean): void {
  _isRedirectingToLogin = value;
}

const REDIRECT_PARAM = "redirect";

// Build the login page url, carrying the current location along
// so the user can be returned to it after logging in
export function getLoginUrl(loginPage: string = `${baseUrl}login`): string {
  const url = new URL(loginPage, window.location.href);

  // an external login page (eg, an auth proxy) handles its own return url
  if (url.origin !== window.location.origin) {
    return loginPage;
  }

  const { pathname, search, hash } = window.location;
  const current = `${pathname}${search}${hash}`;

  // no need to carry the home page, it is the default after logging in
  if (current !== new URL(baseUrl).pathname) {
    url.searchParams.set(REDIRECT_PARAM, current);
  }

  return url.href;
}

// Resolve where to send the user after a successful login
export function getPostLoginUrl(): string {
  const target = new URLSearchParams(window.location.search).get(
    REDIRECT_PARAM,
  );

  if (!target) {
    return baseUrl;
  }

  // only return to urls on this origin so the param can't be used
  // to send the user to another site
  try {
    const url = new URL(target, window.location.origin);
    return url.origin === window.location.origin ? url.href : baseUrl;
  } catch {
    return baseUrl;
  }
}
