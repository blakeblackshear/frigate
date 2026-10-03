// Module-level flag to prevent multiple simultaneous redirects
// (eg, when multiple SWR queries fail with 401 at once, or when
// both ApiProvider and ProtectedRoute try to redirect)
import { baseUrl } from "./baseUrl";

let _isRedirectingToLogin = false;

export function isRedirectingToLogin(): boolean {
  return _isRedirectingToLogin;
}

export function setRedirectingToLogin(value: boolean): void {
  _isRedirectingToLogin = value;
}

export function getLoginUrl(): string {
  const loginUrl = new URL("login", baseUrl);
  loginUrl.searchParams.set(
    "redirect",
    `${window.location.pathname}${window.location.search}`,
  );
  return loginUrl.href;
}
