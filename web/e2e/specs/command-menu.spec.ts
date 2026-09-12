/**
 * Command menu tests -- HIGH tier.
 *
 * Ctrl+K and "/" open a search box over pages, cameras, camera groups,
 * settings sections and actions. Text fields keep their own keys, recent
 * commands survive a reload, and viewers never see admin entries.
 * The menu is desktop only.
 */

import { test, expect } from "../fixtures/frigate-test";
import type { FrigateApp } from "../fixtures/frigate-test";
import { getMonacoVisibleText } from "../helpers/monaco";
import {
  restrictedProfile,
  viewerProfile,
} from "../fixtures/mock-data/profile";

const SAMPLE_CONFIG = "mqtt:\n  host: mqtt\n";

function menu(app: FrigateApp) {
  return app.page.locator("[cmdk-root]");
}

function commands(app: FrigateApp, text: string | RegExp) {
  return app.page.locator("[cmdk-item]", { hasText: text });
}

/**
 * Reads the recent command ids straight out of idb-keyval's store, which is
 * where useUserPersistence writes under a key namespaced by username. The
 * write is fire and forget, so a test that reloads has to wait for it first.
 */
function storedRecents(app: FrigateApp) {
  return app.page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const request = indexedDB.open("keyval-store");
        request.onerror = () => resolve([]);
        request.onsuccess = () => {
          const read = request.result
            .transaction("keyval", "readonly")
            .objectStore("keyval")
            .get("command-menu-recent:admin");
          read.onerror = () => resolve([]);
          read.onsuccess = () => resolve(read.result ?? []);
        };
      }),
  );
}

async function openMenu(app: FrigateApp) {
  await app.page.keyboard.press("Control+k");
  await expect(menu(app)).toBeVisible();
}

test.describe("Command menu - opening @high", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "The command menu is desktop only",
  );

  test("Ctrl+K opens the menu and closes it again", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    await openMenu(frigateApp);

    await expect(menu(frigateApp).locator("[cmdk-group-heading]")).toHaveText([
      "Pages",
      "Cameras",
      "Camera groups",
      "Settings",
      "Actions",
    ]);

    await frigateApp.page.keyboard.press("Control+k");
    await expect(menu(frigateApp)).toBeHidden();
  });

  test("slash opens the menu without typing itself", async ({ frigateApp }) => {
    await frigateApp.goto("/review");
    await frigateApp.page.keyboard.press("/");
    await expect(menu(frigateApp)).toBeVisible();
    await expect(frigateApp.page.locator("[cmdk-input]")).toHaveValue("");
  });

  test("the config editor keeps Ctrl+K and slash", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ configRaw: SAMPLE_CONFIG });
    await frigateApp.goto("/config");
    await expect(frigateApp.page.locator(".monaco-editor").first()).toBeVisible(
      { timeout: 15_000 },
    );

    await frigateApp.page.locator(".monaco-editor").first().click();
    await frigateApp.page.keyboard.type("/comment");
    await expect
      .poll(() => getMonacoVisibleText(frigateApp.page), { timeout: 10_000 })
      .toContain("/comment");
    await expect(menu(frigateApp)).toHaveCount(0);

    // Ctrl+K opens a chord in Monaco, so the menu leaves it alone. Escape
    // cancels the pending chord, which would otherwise eat the next key.
    await frigateApp.page.keyboard.press("Control+k");
    await expect(menu(frigateApp)).toHaveCount(0);
    await frigateApp.page.keyboard.press("Escape");
  });
});

test.describe("Command menu - navigating @high", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "The command menu is desktop only",
  );

  test("a camera entry jumps to its live view", async ({ frigateApp }) => {
    await frigateApp.goto("/review");
    await openMenu(frigateApp);
    await frigateApp.page.keyboard.type("backy");

    await expect(commands(frigateApp, "Garage")).toHaveCount(0);
    await commands(frigateApp, "Backyard").filter({ hasText: "Live" }).click();

    await expect(frigateApp.page).toHaveURL(/\/#backyard$/);
    await expect(menu(frigateApp)).toBeHidden();
  });

  test("a camera entry deep links into review", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    await openMenu(frigateApp);
    await frigateApp.page.keyboard.type("front door");
    await commands(frigateApp, "Front Door")
      .filter({ hasText: "Review" })
      .click();

    await expect(frigateApp.page).toHaveURL(/\/review\?cameras=front_door$/);
  });

  test("a camera group opens the live grid filtered to it", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/review");
    await openMenu(frigateApp);
    await frigateApp.page.keyboard.type("outdoor");
    await commands(frigateApp, "outdoor").click();

    await expect(frigateApp.page).toHaveURL(/\/\?group=outdoor$/);
  });

  test("repeated settings names are told apart by their group", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/");
    await openMenu(frigateApp);
    await frigateApp.page.keyboard.type("object detection");

    const matches = commands(frigateApp, "Object detection");
    await expect(matches).toHaveCount(2);
    await expect(
      matches.filter({ hasText: "Global configuration" }),
    ).toHaveCount(1);
    await expect(
      matches.filter({ hasText: "Camera configuration" }),
    ).toHaveCount(1);

    await matches.filter({ hasText: "Camera configuration" }).click();
    await expect(frigateApp.page).toHaveURL(/\/settings\?page=cameraDetect$/);
  });

  test("a command run once comes back under Recent", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    await openMenu(frigateApp);
    await frigateApp.page.keyboard.type("export");
    await commands(frigateApp, "Export").first().click();
    await expect(frigateApp.page).toHaveURL(/\/export$/);

    await expect
      .poll(() => storedRecents(frigateApp))
      .toEqual(["page-/export"]);

    // Recents live in IndexedDB, so they outlive a full reload.
    await frigateApp.goto("/");
    await openMenu(frigateApp);
    await expect(
      menu(frigateApp).locator("[cmdk-group-heading]").first(),
    ).toHaveText("Recent");
    await expect(
      frigateApp.page.locator('[cmdk-item][data-value^="recent-"]'),
    ).toHaveText(["Export"]);
  });
});

test.describe("Command menu - actions @high", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "The command menu is desktop only",
  );

  test("the theme action flips the root class", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    const isDark = () =>
      frigateApp.page.evaluate(() =>
        document.documentElement.classList.contains("dark"),
      );
    const before = await isDark();

    await openMenu(frigateApp);
    await frigateApp.page.keyboard.type("toggle light");
    await commands(frigateApp, "Toggle light and dark mode").click();

    await expect.poll(isDark).toBe(!before);
  });

  test("restart asks for confirmation first", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    await openMenu(frigateApp);
    await frigateApp.page.keyboard.type("restart");
    await commands(frigateApp, "Restart Frigate").click();

    const confirm = frigateApp.page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: /cancel/i }).click();
    await expect(confirm).toBeHidden();
  });
});

test.describe("Command menu - permissions @high", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "The command menu is desktop only",
  );

  test("viewers get cameras but no admin entries", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ profile: viewerProfile() });
    await frigateApp.goto("/");
    await openMenu(frigateApp);

    await expect(commands(frigateApp, "Front Door").first()).toBeVisible();
    await expect(commands(frigateApp, "UI settings")).toHaveCount(1);
    await expect(commands(frigateApp, "Restart Frigate")).toHaveCount(0);
    await expect(commands(frigateApp, "Configuration Editor")).toHaveCount(0);
    await expect(commands(frigateApp, "Motion tuner")).toHaveCount(0);
  });

  test("a custom role only reaches groups holding its cameras", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      profile: restrictedProfile(["garage"], { role: "restricted" }),
    });
    await frigateApp.goto("/");
    await openMenu(frigateApp);

    const input = frigateApp.page.locator("[cmdk-input]");
    const group = (name: string) =>
      frigateApp.page.locator(`[cmdk-item][data-value="group-${name}"]`);

    await input.fill("garage");
    await expect(commands(frigateApp, "Garage").first()).toBeVisible();
    await expect(group("default")).toHaveCount(1);

    // "outdoor" holds no camera this role may see
    await input.fill("outdoor");
    await expect(group("outdoor")).toHaveCount(0);

    // nor may a hidden camera's name pull a group up through its search terms
    await input.fill("backyard");
    await expect(group("default")).toHaveCount(0);
    await expect(commands(frigateApp, "Backyard")).toHaveCount(0);
  });
});

test.describe("Command menu - mobile @high @mobile", () => {
  test.skip(
    ({ frigateApp }) => !frigateApp.isMobile,
    "Desktop is covered above",
  );

  test("the menu is not mounted on a phone", async ({ frigateApp }) => {
    await frigateApp.goto("/");
    await frigateApp.page.keyboard.press("Control+k");
    await expect(menu(frigateApp)).toHaveCount(0);

    await frigateApp.page.keyboard.press("/");
    await expect(menu(frigateApp)).toHaveCount(0);
  });
});
