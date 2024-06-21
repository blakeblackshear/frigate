declare global {
  interface Window {
    baseUrl?: string;
  }
}

export const baseUrl = `${window.location.protocol}//${window.location.host}${window.baseUrl || "/"}`;
