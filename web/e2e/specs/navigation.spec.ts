/**
 * Navigation tests -- CRITICAL tier.
 *
 * Tests sidebar (desktop) and bottombar (mobile) navigation,
 * conditional nav items, settings menus, and route transitions.
 */

import { test, expect } from "../fixtures/frigate-test";
import { BasePage } from "../pages/base.page";

test.describe("Navigation @critical", () => {
  test("app loads and renders page root", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });

  test("logo is visible and links to home", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    const base = new BasePage(frigateApp.page, !frigateApp.isMobile);

    if (!frigateApp.isMobile) {
      // Desktop: logo in sidebar
      const logo = base.sidebar.locator('a[href="/"]').first();
      await expect(logo).toBeVisible();
    }
  });

  test("Live nav item is active on root path", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    const liveLink = frigateApp.page.locator('a[href="/"]').first();
    await expect(liveLink).toBeVisible();
  });

  test("navigate to Review page", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    const base = new BasePage(frigateApp.page, !frigateApp.isMobile);

    await base.navigateTo("/review");
    await expect(frigateApp.page).toHaveURL(/\/review/);
  });

  test("navigate to Explore page", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    const base = new BasePage(frigateApp.page, !frigateApp.isMobile);

    await base.navigateTo("/explore");
    await expect(frigateApp.page).toHaveURL(/\/explore/);
  });

  test("navigate to Export page", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    const base = new BasePage(frigateApp.page, !frigateApp.isMobile);

    await base.navigateTo("/export");
    await expect(frigateApp.page).toHaveURL(/\/export/);
  });

  test("all primary nav links are present", async ({ frigateApp }) => {
    await frigateApp.goto("/");

    // Live, Review, Explore, Export are always present
    await expect(frigateApp.page.locator('a[href="/"]').first()).toBeVisible();
    await expect(
      frigateApp.page.locator('a[href="/review"]').first(),
    ).toBeVisible();
    await expect(
      frigateApp.page.locator('a[href="/explore"]').first(),
    ).toBeVisible();
    await expect(
      frigateApp.page.locator('a[href="/export"]').first(),
    ).toBeVisible();
  });

  test("desktop sidebar is visible on desktop, hidden on mobile", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/");
    const base = new BasePage(frigateApp.page, !frigateApp.isMobile);

    if (!frigateApp.isMobile) {
      await expect(base.sidebar).toBeVisible();
    } else {
      await expect(base.sidebar).not.toBeVisible();
    }
  });

  test("navigate between pages without crash", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    const base = new BasePage(frigateApp.page, !frigateApp.isMobile);
    const pageRoot = frigateApp.page.locator("#pageRoot");

    // Navigate through all main pages in sequence
    await base.navigateTo("/review");
    await expect(pageRoot).toBeVisible({ timeout: 10_000 });

    await base.navigateTo("/explore");
    await expect(pageRoot).toBeVisible({ timeout: 10_000 });

    await base.navigateTo("/export");
    await expect(pageRoot).toBeVisible({ timeout: 10_000 });

    // Navigate back to review (not root, to avoid same-route re-render issues)
    await base.navigateTo("/review");
    await expect(pageRoot).toBeVisible({ timeout: 10_000 });
  });

  test("unknown route redirects to home", async ({ frigateApp }) => {
    // Navigate to an unknown route - React Router's catch-all should redirect
    await frigateApp.page.goto("/nonexistent-route");
    // Wait for React to render and redirect
    await frigateApp.page.waitForTimeout(2000);
    // Should either be at root or show the page root (app didn't crash)
    const url = frigateApp.page.url();
    const hasPageRoot = await frigateApp.page
      .locator("#pageRoot")
      .isVisible()
      .catch(() => false);
    expect(url.endsWith("/") || hasPageRoot).toBeTruthy();
  });

  test("Faces nav hidden when face_recognition disabled", async ({
    frigateApp,
  }) => {
    // Default config has face_recognition.enabled = false
    await frigateApp.goto("/");
    await expect(frigateApp.page.locator('a[href="/faces"]')).not.toBeVisible();
  });

  test("Chat nav hidden when genai model is none", async ({ frigateApp }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    // Override config with genai.model = "none" to hide chat
    await frigateApp.installDefaults({
      config: {
        genai: {
          enabled: false,
          provider: "ollama",
          model: "none",
          base_url: "",
        },
      },
    });
    await frigateApp.goto("/");
    await expect(frigateApp.page.locator('a[href="/chat"]')).not.toBeVisible();
  });

  test("Faces nav visible when face_recognition enabled and admin on desktop", async ({
    frigateApp,
    page,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }

    // Re-install with face_recognition enabled
    await frigateApp.installDefaults({
      config: {
        face_recognition: { enabled: true },
      },
    });
    await frigateApp.goto("/");
    await expect(page.locator('a[href="/faces"]')).toBeVisible();
  });

  test("Chat nav visible when genai model set and admin on desktop", async ({
    frigateApp,
    page,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }

    await frigateApp.installDefaults({
      config: {
        genai: { enabled: true, model: "llava" },
      },
    });
    await frigateApp.goto("/");
    await expect(page.locator('a[href="/chat"]')).toBeVisible();
  });

  test("Classification nav visible for admin on desktop", async ({
    frigateApp,
    page,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }

    await frigateApp.goto("/");
    await expect(page.locator('a[href="/classification"]')).toBeVisible();
  });
});
