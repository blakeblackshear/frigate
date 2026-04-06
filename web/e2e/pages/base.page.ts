/**
 * Base page object with viewport-aware navigation helpers.
 *
 * Desktop: clicks sidebar NavLink elements.
 * Mobile: clicks bottombar NavLink elements.
 */

import type { Page, Locator } from "@playwright/test";

export class BasePage {
  constructor(
    protected page: Page,
    public isDesktop: boolean,
  ) {}

  get isMobile() {
    return !this.isDesktop;
  }

  /** The sidebar (desktop only) */
  get sidebar(): Locator {
    return this.page.locator("aside");
  }

  /** The bottombar (mobile only) */
  get bottombar(): Locator {
    return this.page
      .locator('[data-bottombar="true"]')
      .or(this.page.locator(".absolute.inset-x-4.bottom-0").first());
  }

  /** The main page content area */
  get pageRoot(): Locator {
    return this.page.locator("#pageRoot");
  }

  /** Navigate using a NavLink by its href */
  async navigateTo(path: string) {
    // Wait for any in-progress React renders to settle before clicking
    await this.page.waitForLoadState("domcontentloaded");
    // Use page.click with a CSS selector to avoid stale element issues
    // when React re-renders the nav during route transitions.
    // force: true bypasses actionability checks that fail when React
    // detaches and reattaches nav elements during re-renders.
    const selector = this.isDesktop
      ? `aside a[href="${path}"]`
      : `a[href="${path}"]`;
    // Use dispatchEvent to bypass actionability checks that fail when
    // React tooltip wrappers detach/reattach nav elements during re-renders
    await this.page.locator(selector).first().dispatchEvent("click");
    // React Router navigates client-side, wait for URL update
    if (path !== "/") {
      const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      await this.page.waitForURL(new RegExp(escaped), { timeout: 10_000 });
    }
  }

  /** Navigate to Live page */
  async goToLive() {
    await this.navigateTo("/");
  }

  /** Navigate to Review page */
  async goToReview() {
    await this.navigateTo("/review");
  }

  /** Navigate to Explore page */
  async goToExplore() {
    await this.navigateTo("/explore");
  }

  /** Navigate to Export page */
  async goToExport() {
    await this.navigateTo("/export");
  }

  /** Check if the page has loaded */
  async waitForPageLoad() {
    await this.page.waitForSelector("#pageRoot", { timeout: 10_000 });
  }
}
