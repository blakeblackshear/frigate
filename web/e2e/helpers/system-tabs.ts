import type { FrigateApp } from "../fixtures/frigate-test";

// On mobile the System tabs sit in an OverflowStrip, which keeps an inert copy
// of every tab for measurement and hides the ones that do not fit behind a
// kebab. The selected tab always stays in the strip.

export function systemTab(frigateApp: FrigateApp, name: string) {
  return frigateApp.page
    .locator(`[aria-label="Select ${name}" i]:not([inert] *)`)
    .first();
}
