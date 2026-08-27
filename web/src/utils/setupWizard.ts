// dismissing the setup wizard is per-device UI state, so it lives in the
// browser rather than in the config the wizard exists to write
const DISMISSED_KEY = "frigate-setup-dismissed";

export function isSetupDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function dismissSetup(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, "true");
  } catch {
    // storage can be unavailable; showing the wizard again beats failing here
  }
}
