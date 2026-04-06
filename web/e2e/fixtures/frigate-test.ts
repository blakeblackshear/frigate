/* eslint-disable react-hooks/rules-of-hooks */
/**
 * Extended Playwright test fixture with FrigateApp.
 *
 * Every test imports `test` and `expect` from this file instead of
 * @playwright/test directly. The `frigateApp` fixture provides a
 * fully mocked Frigate frontend ready for interaction.
 *
 * CRITICAL: All route/WS handlers are registered before page.goto()
 * to prevent AuthProvider from redirecting to login.html.
 */

import { test as base, expect, type Page } from "@playwright/test";
import {
  ApiMocker,
  MediaMocker,
  type ApiMockOverrides,
} from "../helpers/api-mocker";
import { WsMocker } from "../helpers/ws-mocker";

export class FrigateApp {
  public api: ApiMocker;
  public media: MediaMocker;
  public ws: WsMocker;
  public page: Page;

  private isDesktop: boolean;

  constructor(page: Page, projectName: string) {
    this.page = page;
    this.api = new ApiMocker(page);
    this.media = new MediaMocker(page);
    this.ws = new WsMocker();
    this.isDesktop = projectName === "desktop";
  }

  get isMobile() {
    return !this.isDesktop;
  }

  /** Install all mocks with default data. Call before goto(). */
  async installDefaults(overrides?: ApiMockOverrides) {
    // Mock i18n locale files to prevent 404s
    await this.page.route("**/locales/**", async (route) => {
      // Let the request through to the built files
      return route.fallback();
    });

    await this.ws.install(this.page);
    await this.media.install();
    await this.api.install(overrides);
  }

  /** Navigate to a page. Always call installDefaults() first. */
  async goto(path: string) {
    await this.page.goto(path);
    // Wait for the app to render past the loading indicator
    await this.page.waitForSelector("#pageRoot", { timeout: 10_000 });
  }

  /** Navigate to a page that may show a loading indicator */
  async gotoAndWait(path: string, selector: string) {
    await this.page.goto(path);
    await this.page.waitForSelector(selector, { timeout: 10_000 });
  }
}

type FrigateFixtures = {
  frigateApp: FrigateApp;
};

export const test = base.extend<FrigateFixtures>({
  frigateApp: async ({ page }, use, testInfo) => {
    const app = new FrigateApp(page, testInfo.project.name);
    await app.installDefaults();
    await use(app);
  },
});

export { expect };
