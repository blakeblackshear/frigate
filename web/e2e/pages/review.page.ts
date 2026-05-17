/**
 * Review/events page object.
 *
 * Encapsulates severity tab, filter bar, calendar, and mobile filter
 * drawer selectors. Does NOT own assertions.
 */

import type { Locator, Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class ReviewPage extends BasePage {
  constructor(page: Page, isDesktop: boolean) {
    super(page, isDesktop);
  }

  get alertsTab(): Locator {
    return this.page.getByLabel("Alerts");
  }

  get detectionsTab(): Locator {
    return this.page.getByLabel("Detections");
  }

  get motionTab(): Locator {
    return this.page.getByRole("radio", { name: "Motion" });
  }

  get camerasFilterTrigger(): Locator {
    return this.page.getByRole("button", { name: /cameras/i }).first();
  }

  get calendarTrigger(): Locator {
    return this.page.getByRole("button", { name: /24 hours|calendar|date/i });
  }

  get showReviewedToggle(): Locator {
    return this.page.getByRole("button", { name: /reviewed/i });
  }

  get reviewItems(): Locator {
    return this.page.locator(".review-item");
  }

  /** The filter popover content (desktop) or drawer (mobile). */
  get filterOverlay(): Locator {
    return this.page
      .locator(
        '[data-radix-popper-content-wrapper], [role="dialog"], [data-vaul-drawer]',
      )
      .first();
  }
}
