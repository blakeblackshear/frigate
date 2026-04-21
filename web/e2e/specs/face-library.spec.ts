/**
 * Face Library page tests -- HIGH tier.
 *
 * Collection selector, face tiles, grouped recent-recognition dialog
 * (migrated from radix-overlay-regressions.spec.ts), and mobile
 * library selector.
 */

import { type Locator } from "@playwright/test";
import { test, expect, type FrigateApp } from "../fixtures/frigate-test";
import {
  basicFacesMock,
  emptyFacesMock,
  withGroupedTrainingAttempt,
} from "../fixtures/mock-data/faces";
import {
  expectBodyInteractive,
  waitForBodyInteractive,
} from "../helpers/overlay-interaction";

const GROUPED_EVENT_ID = "1775487131.3863528-abc123";

function groupedFacesMock() {
  return withGroupedTrainingAttempt(basicFacesMock(), {
    eventId: GROUPED_EVENT_ID,
    attempts: [
      { timestamp: 1775487131.3863528, label: "unknown", score: 0.95 },
      { timestamp: 1775487132.3863528, label: "unknown", score: 0.91 },
    ],
  });
}

async function installGroupedFaces(app: FrigateApp) {
  await app.api.install({
    events: [
      {
        id: GROUPED_EVENT_ID,
        label: "person",
        sub_label: null,
        camera: "front_door",
        start_time: 1775487131.3863528,
        end_time: 1775487161.3863528,
        false_positive: false,
        zones: ["front_yard"],
        thumbnail: null,
        has_clip: true,
        has_snapshot: true,
        retain_indefinitely: false,
        plus_id: null,
        model_hash: "abc123",
        detector_type: "cpu",
        model_type: "ssd",
        data: {
          top_score: 0.92,
          score: 0.92,
          region: [0.1, 0.1, 0.5, 0.8],
          box: [0.2, 0.15, 0.45, 0.75],
          area: 0.18,
          ratio: 0.6,
          type: "object",
          path_data: [],
        },
      },
    ],
    faces: groupedFacesMock(),
  });
}

async function openGroupedFaceDialog(app: FrigateApp): Promise<Locator> {
  await installGroupedFaces(app);
  await app.goto("/faces");
  const groupedImage = app.page
    .locator('img[src*="clips/faces/train/"]')
    .first();
  const groupedCard = groupedImage.locator("xpath=..");
  await expect(groupedImage).toBeVisible({ timeout: 5_000 });
  await groupedCard.click();
  const dialog = app.page
    .getByRole("dialog")
    .filter({ has: app.page.locator('img[src*="clips/faces/train/"]') })
    .first();
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  await expect(dialog.locator('img[src*="clips/faces/train/"]')).toHaveCount(2);
  return dialog;
}

/**
 * Opens the LibrarySelector dropdown (the single button at the top-left of
 * the Face Library page) and returns the dropdown menu locator.
 *
 * The LibrarySelector is a single DropdownMenu whose trigger shows the
 * current tab name + count (e.g. "Recent Recognitions (0)"). Named face
 * collections (alice, bob, charlie) are items inside this dropdown.
 */
async function openLibraryDropdown(app: FrigateApp): Promise<Locator> {
  // The trigger is the first button on the page with a parenthesised count.
  const trigger = app.page
    .getByRole("button")
    .filter({ hasText: /\(\d+\)/ })
    .first();
  await expect(trigger).toBeVisible({ timeout: 10_000 });
  await trigger.click();
  const menu = app.page
    .locator('[role="menu"], [data-radix-menu-content]')
    .first();
  await expect(menu).toBeVisible({ timeout: 5_000 });
  return menu;
}

test.describe("Face Library — collection selector @high", () => {
  test("selector shows named face collections", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ faces: basicFacesMock() });
    await frigateApp.goto("/faces");
    // Named collections appear in the LibrarySelector dropdown.
    const menu = await openLibraryDropdown(frigateApp);
    await expect(menu.getByText(/alice/i).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("empty state renders when no faces exist", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ faces: emptyFacesMock() });
    await frigateApp.goto("/faces");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
    await expect(
      frigateApp.page.locator('img[src*="/clips/faces/"]'),
    ).toHaveCount(0);
  });

  test("tiles render for each named collection", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ faces: basicFacesMock() });
    await frigateApp.goto("/faces");
    // Open the dropdown — collections list shows "alice (2)" and "bob (1)".
    const menu = await openLibraryDropdown(frigateApp);
    await expect(
      menu.locator('[role="menuitem"]').filter({ hasText: /alice/i }).first(),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      menu.locator('[role="menuitem"]').filter({ hasText: /bob/i }).first(),
    ).toBeVisible();
  });
});

test.describe("Face Library — delete flow (desktop) @high", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Delete action menu is desktop-focused",
  );

  test("deleting a collection fires POST /faces/<name>/delete", async ({
    frigateApp,
  }) => {
    let deleteUrl: string | null = null;
    let deleteBody: unknown = null;
    // Install base mocks first, then register our more-specific route AFTER
    // so it takes priority over the ApiMocker catch-all (Playwright LIFO order).
    await frigateApp.installDefaults({ faces: basicFacesMock() });
    await frigateApp.page.route(
      /\/api\/faces\/[^/]+\/delete/,
      async (route) => {
        deleteUrl = route.request().url();
        deleteBody = route.request().postDataJSON();
        await route.fulfill({ json: { success: true } });
      },
    );
    await frigateApp.goto("/faces");

    // Open the LibrarySelector dropdown and click the trash icon next
    // to the alice row. The trash icon is a ghost-variant Button inside
    // the DropdownMenuItem — it becomes visible on hover/focus.
    const menu = await openLibraryDropdown(frigateApp);
    const aliceRow = menu
      .locator('[role="menuitem"]')
      .filter({ hasText: /alice/i })
      .first();
    await expect(aliceRow).toBeVisible({ timeout: 5_000 });
    // Hover first to make hover-only opacity-0 buttons visible.
    await aliceRow.hover();
    // The icon buttons have no aria-label or title. The row renders exactly
    // two buttons in fixed source order: [0] LuPencil (rename), [1] LuTrash2
    // (delete). This order is determined by FaceLibrary.tsx and is stable.
    const trashBtn = aliceRow.locator("button").nth(1);
    await trashBtn.click();

    // The delete confirmation is a Dialog (not AlertDialog) in this flow.
    const dialog = frigateApp.page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog
      .getByRole("button", { name: /delete/i })
      .first()
      .click();

    await expect
      .poll(() => deleteUrl, { timeout: 5_000 })
      .toMatch(/\/faces\/alice\/delete/);
    expect(deleteBody).toMatchObject({ ids: expect.any(Array) });
  });
});

test.describe("Face Library — rename flow (desktop) @high", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Rename action menu is desktop-focused",
  );

  test("renaming a collection fires PUT /faces/<name>/rename", async ({
    frigateApp,
  }) => {
    let renameUrl: string | null = null;
    let renameBody: unknown = null;
    // Install base mocks first, then register our more-specific route AFTER
    // so it takes priority over the ApiMocker catch-all (Playwright LIFO order).
    await frigateApp.installDefaults({ faces: basicFacesMock() });
    await frigateApp.page.route(
      /\/api\/faces\/[^/]+\/rename/,
      async (route) => {
        renameUrl = route.request().url();
        renameBody = route.request().postDataJSON();
        await route.fulfill({ json: { success: true } });
      },
    );
    await frigateApp.goto("/faces");

    // Open the LibrarySelector dropdown and click the pencil (rename) icon
    // next to alice. The icon is a ghost Button inside the DropdownMenuItem.
    const menu = await openLibraryDropdown(frigateApp);
    const aliceRow = menu
      .locator('[role="menuitem"]')
      .filter({ hasText: /alice/i })
      .first();
    await expect(aliceRow).toBeVisible({ timeout: 5_000 });
    await aliceRow.hover();
    // The icon buttons have no aria-label or title. The row renders exactly
    // two buttons in fixed source order: [0] LuPencil (rename), [1] LuTrash2
    // (delete). This order is determined by FaceLibrary.tsx and is stable.
    const pencilBtn = aliceRow.locator("button").nth(0);
    await pencilBtn.click();

    // TextEntryDialog — fill the input and confirm.
    const dialog = frigateApp.page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.locator("input").first().fill("alice_renamed");
    await dialog
      .getByRole("button", { name: /save|rename|confirm/i })
      .first()
      .click();

    await expect
      .poll(() => renameUrl, { timeout: 5_000 })
      .toMatch(/\/faces\/alice\/rename/);
    expect(renameBody).toEqual({ new_name: "alice_renamed" });
  });
});

test.describe("Face Library — upload flow @high", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Upload button has no accessible text on mobile — icon-only on narrow viewports",
  );

  test("Upload button opens the upload dialog", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ faces: basicFacesMock() });
    await frigateApp.goto("/faces");

    // Navigate to the alice tab by opening the dropdown and clicking alice.
    const menu = await openLibraryDropdown(frigateApp);
    await menu
      .locator('[role="menuitem"]')
      .filter({ hasText: /alice/i })
      .first()
      .click();

    // After switching to alice, the Upload Image button appears in the toolbar.
    const uploadBtn = frigateApp.page
      .getByRole("button")
      .filter({ hasText: /upload/i })
      .first();
    await expect(uploadBtn).toBeVisible({ timeout: 5_000 });
    await uploadBtn.click();

    // UploadImageDialog renders a file input + confirm button.
    const dialog = frigateApp.page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.locator('input[type="file"]')).toHaveCount(1);
  });
});

test.describe("FaceSelectionDialog @high", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Grouped dropdown flow is desktop-only",
  );

  test("reclassify dropdown selects a name and closes cleanly", async ({
    frigateApp,
  }) => {
    // Migrated from radix-overlay-regressions.spec.ts.
    const dialog = await openGroupedFaceDialog(frigateApp);
    const triggers = dialog.locator('[aria-haspopup="menu"]');
    await expect(triggers).toHaveCount(2);

    await triggers.first().click();
    const menu = frigateApp.page
      .locator('[role="menu"], [data-radix-menu-content]')
      .first();
    await expect(menu).toBeVisible({ timeout: 5_000 });

    await menu.getByRole("menuitem", { name: /^bob$/i }).click();

    await expect(menu).not.toBeVisible({ timeout: 3_000 });
    await expect(dialog).toBeVisible();

    const tooltipVisible = await frigateApp.page
      .locator('[role="tooltip"]')
      .filter({ hasText: /train face/i })
      .isVisible()
      .catch(() => false);
    expect(
      tooltipVisible,
      "Train Face tooltip popped after dropdown closed — focus-restore regression",
    ).toBe(false);
  });

  test("second dropdown open accepts typeahead keyboard input", async ({
    frigateApp,
  }) => {
    // Migrated from radix-overlay-regressions.spec.ts.
    const dialog = await openGroupedFaceDialog(frigateApp);
    const triggers = dialog.locator('[aria-haspopup="menu"]');
    await expect(triggers).toHaveCount(2);

    await triggers.first().click();
    let menu = frigateApp.page
      .locator('[role="menu"], [data-radix-menu-content]')
      .first();
    await expect(menu).toBeVisible({ timeout: 5_000 });
    await menu.getByRole("menuitem", { name: /^bob$/i }).click();
    await expect(menu).not.toBeVisible({ timeout: 3_000 });

    await triggers.nth(1).click();
    menu = frigateApp.page
      .locator('[role="menu"], [data-radix-menu-content]')
      .first();
    await expect(menu).toBeVisible({ timeout: 5_000 });

    await frigateApp.page.keyboard.press("c");
    await expect
      .poll(
        async () =>
          frigateApp.page.evaluate(
            () =>
              document.activeElement?.textContent?.trim().toLowerCase() ?? "",
          ),
        { timeout: 2_000 },
      )
      .toMatch(/^charlie/);

    await frigateApp.page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible({ timeout: 3_000 });
  });
});

test.describe("Face Library — mobile @high @mobile", () => {
  test.skip(({ frigateApp }) => !frigateApp.isMobile, "Mobile-only");

  test("mobile library selector dropdown closes cleanly on Escape", async ({
    frigateApp,
  }) => {
    // Migrated from radix-overlay-regressions.spec.ts.
    await installGroupedFaces(frigateApp);
    await frigateApp.goto("/faces");

    const selector = frigateApp.page
      .getByRole("button")
      .filter({ hasText: /\(\d+\)/ })
      .first();
    await expect(selector).toBeVisible({ timeout: 5_000 });
    await selector.click();

    const menu = frigateApp.page
      .locator('[role="menu"], [data-radix-menu-content]')
      .first();
    await expect(menu).toBeVisible({ timeout: 3_000 });

    await frigateApp.page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible({ timeout: 3_000 });
    await waitForBodyInteractive(frigateApp.page);
    await expectBodyInteractive(frigateApp.page);
  });
});
