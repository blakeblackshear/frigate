/**
 * Live dashboard + single-camera page object.
 *
 * Encapsulates selectors and viewport-conditional openers for the
 * Live route. Does NOT own assertions — specs call expect on the
 * locators returned from these getters.
 */

import type { Locator, Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class LivePage extends BasePage {
  constructor(page: Page, isDesktop: boolean) {
    super(page, isDesktop);
  }

  /** The camera card wrapper on the dashboard, keyed by camera name. */
  cameraCard(name: string): Locator {
    return this.page.locator(`[data-camera='${name}']`);
  }

  /** Back button on the single-camera view header (desktop text). */
  get backButton(): Locator {
    return this.page.getByText("Back", { exact: true });
  }

  /** History button on the single-camera view header (desktop text). */
  get historyButton(): Locator {
    return this.page.getByText("History", { exact: true });
  }

  /** All CameraFeatureToggle elements (active + inactive). */
  get featureToggles(): Locator {
    // Use div selector to exclude NavItem anchor elements that share the same classes.
    return this.page.locator(
      "div.flex.flex-col.items-center.justify-center.bg-selected, div.flex.flex-col.items-center.justify-center.bg-secondary",
    );
  }

  /** Only the active (bg-selected) feature toggles. */
  get activeFeatureToggles(): Locator {
    // Use div selector to exclude NavItem anchor elements that share the same classes.
    return this.page.locator(
      "div.flex.flex-col.items-center.justify-center.bg-selected",
    );
  }

  /** Open the right-click context menu on a camera card (desktop only). */
  async openContextMenuOn(cameraName: string): Promise<Locator> {
    await this.cameraCard(cameraName).first().click({ button: "right" });
    return this.page
      .locator('[role="menu"], [data-radix-menu-content]')
      .first();
  }
}
