/**
 * System page tests -- MEDIUM tier (promoted to cover migrated
 * RestartDialog test from radix-overlay-regressions.spec.ts).
 *
 * Tab switching, version + last-refreshed display, and the
 * RestartDialog cancel flow.
 */

import { test, expect } from "../fixtures/frigate-test";
import {
  expectBodyInteractive,
  waitForBodyInteractive,
} from "../helpers/overlay-interaction";

test.describe("System — tabs @medium", () => {
  test("general tab is active by default via #general hash", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/system#general");
    await expect(frigateApp.page.getByLabel("Select general")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 15_000 },
    );
    await expect(frigateApp.page.getByLabel("Select storage")).toBeVisible();
    await expect(frigateApp.page.getByLabel("Select cameras")).toBeVisible();
  });

  test("Storage tab activates and deactivates General", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/system#general");
    await expect(frigateApp.page.getByLabel("Select general")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 15_000 },
    );
    await frigateApp.page.getByLabel("Select storage").click();
    await expect(frigateApp.page.getByLabel("Select storage")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 5_000 },
    );
    await expect(frigateApp.page.getByLabel("Select general")).toHaveAttribute(
      "data-state",
      "off",
    );
  });

  test("Cameras tab activates", async ({ frigateApp }) => {
    await frigateApp.goto("/system#general");
    await expect(frigateApp.page.getByLabel("Select general")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 15_000 },
    );
    await frigateApp.page.getByLabel("Select cameras").click();
    await expect(frigateApp.page.getByLabel("Select cameras")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 5_000 },
    );
  });

  test("general tab shows version and last-refreshed", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/system#general");
    await expect(frigateApp.page.getByLabel("Select general")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 15_000 },
    );
    await expect(frigateApp.page.getByText("0.15.0-test")).toBeVisible();
    await expect(frigateApp.page.getByText(/Last refreshed/)).toBeVisible();
  });

  test("storage tab renders content after switching", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/system#general");
    await expect(frigateApp.page.getByLabel("Select general")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 15_000 },
    );
    await frigateApp.page.getByLabel("Select storage").click();
    await expect(frigateApp.page.getByLabel("Select storage")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 5_000 },
    );
    // On desktop, tab buttons render text labels so the word "storage"
    // always appears in #pageRoot after switching. On mobile, tabs are
    // icon-only, so we verify the general-tab content disappears instead
    // (the storage tab's metrics section is hidden but general is gone).
    if (!frigateApp.isMobile) {
      await expect
        .poll(
          async () => (await frigateApp.page.textContent("#pageRoot")) ?? "",
          { timeout: 10_000 },
        )
        .toMatch(/storage|mount|disk|used|free/i);
    } else {
      // Mobile: tab activation (data-state "on") already asserted above.
      // Additionally confirm general tab is no longer the active tab.
      await expect(
        frigateApp.page.getByLabel("Select general"),
      ).toHaveAttribute("data-state", "off", { timeout: 5_000 });
    }
  });

  test("cameras tab renders each configured camera", async ({ frigateApp }) => {
    await frigateApp.goto("/system#general");
    await expect(frigateApp.page.getByLabel("Select general")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 15_000 },
    );
    await frigateApp.page.getByLabel("Select cameras").click();
    await expect(frigateApp.page.getByLabel("Select cameras")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 5_000 },
    );
    // Cameras tab lists every camera from config/stats. The default
    // mock has front_door, backyard, garage.
    for (const cam of ["front_door", "backyard", "garage"]) {
      await expect(
        frigateApp.page
          .getByText(new RegExp(cam.replace("_", ".?"), "i"))
          .first(),
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("enrichments tab renders when semantic search is enabled", async ({
    frigateApp,
  }) => {
    // Override config to guarantee the enrichments tab is present.
    // System.tsx shows the tab when semantic_search.enabled === true.
    await frigateApp.installDefaults({
      config: { semantic_search: { enabled: true } },
    });
    await frigateApp.goto("/system#general");
    await expect(frigateApp.page.getByLabel("Select general")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 15_000 },
    );
    const enrichTab = frigateApp.page.getByLabel(/select enrichments/i).first();
    await expect(enrichTab).toBeVisible({ timeout: 5_000 });
    await enrichTab.click();
    await expect(enrichTab).toHaveAttribute("data-state", "on", {
      timeout: 5_000,
    });
  });
});

test.describe("System — RestartDialog @medium", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Sidebar menu is desktop-only",
  );

  test("cancelling restart leaves body interactive", async ({ frigateApp }) => {
    // Migrated from radix-overlay-regressions.spec.ts.
    await frigateApp.goto("/");

    const sidebarTriggers = frigateApp.page
      .locator('[role="complementary"] [aria-haspopup="menu"]')
      .or(frigateApp.page.locator('aside [aria-haspopup="menu"]'));
    const triggerCount = await sidebarTriggers.count();
    expect(triggerCount).toBeGreaterThan(0);

    let opened = false;
    for (let i = 0; i < triggerCount; i++) {
      const trigger = sidebarTriggers.nth(i);
      await trigger.click().catch(() => {});
      const restartItem = frigateApp.page
        .getByRole("menuitem", { name: /restart/i })
        .first();
      const visible = await expect(restartItem)
        .toBeVisible({ timeout: 300 })
        .then(() => true)
        .catch(() => false);
      if (visible) {
        await restartItem.click();
        opened = true;
        break;
      }
      await frigateApp.page.keyboard.press("Escape").catch(() => {});
    }
    expect(opened).toBe(true);

    const cancel = frigateApp.page.getByRole("button", { name: /cancel/i });
    await expect(cancel).toBeVisible({ timeout: 3_000 });
    await cancel.click();

    await waitForBodyInteractive(frigateApp.page);
    await expectBodyInteractive(frigateApp.page);

    const postCancelTrigger = sidebarTriggers.first();
    await postCancelTrigger.click();
    await expect(
      frigateApp.page
        .locator('[role="menu"], [data-radix-menu-content]')
        .first(),
    ).toBeVisible({ timeout: 3_000 });
  });
});

test.describe("System — mobile @medium @mobile", () => {
  test.skip(({ frigateApp }) => !frigateApp.isMobile, "Mobile-only");

  test("tabs render at mobile viewport", async ({ frigateApp }) => {
    await frigateApp.goto("/system#general");
    await expect(frigateApp.page.getByLabel("Select general")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("switching tabs works at mobile viewport", async ({ frigateApp }) => {
    await frigateApp.goto("/system#general");
    await expect(frigateApp.page.getByLabel("Select general")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 15_000 },
    );
    await frigateApp.page.getByLabel("Select storage").click();
    await expect(frigateApp.page.getByLabel("Select storage")).toHaveAttribute(
      "data-state",
      "on",
      { timeout: 5_000 },
    );
  });
});
