/**
 * Radix overlay regression tests -- MEDIUM tier.
 *
 * Guards the bug class fixed by de-duping `@radix-ui/react-dismissable-layer`:
 *
 *   1. Body `pointer-events: none` getting stuck after nested overlays close
 *   2. Dropdown typeahead breaking on the second open
 *   3. Tooltips popping after a dropdown closes (focus restore side-effect)
 *
 * These tests are grouped by UI path rather than by symptom, since a given
 * flow usually exercises more than one failure mode.
 *
 * TODO: migrate these tests into the corresponding page specs
 * (face-library.spec.ts, system.spec.ts, review.spec.ts) when those files
 * come out of PENDING_REWRITE in e2e/scripts/lint-specs.mjs. They live in
 * a dedicated file today so they stay lint-compliant (no waitForTimeout,
 * no conditional isVisible) while the page specs are still exempt.
 */

import { type Locator } from "@playwright/test";
import { test, expect, type FrigateApp } from "../fixtures/frigate-test";
import {
  expectBodyInteractive,
  waitForBodyInteractive,
} from "../helpers/overlay-interaction";

const GROUPED_FACE_EVENT_ID = "1775487131.3863528-abc123";
const GROUPED_FACE_TRAINING_IMAGES = [
  `${GROUPED_FACE_EVENT_ID}-1775487131.3863528-unknown-0.95.webp`,
  `${GROUPED_FACE_EVENT_ID}-1775487132.3863528-unknown-0.91.webp`,
];

async function installGroupedFaceAttemptData(app: FrigateApp) {
  await app.api.install({
    events: [
      {
        id: GROUPED_FACE_EVENT_ID,
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
    faces: {
      train: GROUPED_FACE_TRAINING_IMAGES,
      alice: ["alice-1.webp"],
      bob: ["bob-1.webp"],
      charlie: ["charlie-1.webp"],
      david: ["david-1.webp"],
    },
  });
}

async function openGroupedFaceAttemptDialog(app: FrigateApp): Promise<Locator> {
  await installGroupedFaceAttemptData(app);
  await app.goto("/faces");

  const groupedCardImage = app.page
    .locator('img[src*="clips/faces/train/"]')
    .first();
  const groupedCard = groupedCardImage.locator("xpath=..");
  await expect(groupedCardImage).toBeVisible({ timeout: 5_000 });
  await groupedCard.click();

  const dialog = app.page
    .getByRole("dialog")
    .filter({ has: app.page.locator('img[src*="clips/faces/train/"]') })
    .first();
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  await expect(dialog.locator('img[src*="clips/faces/train/"]')).toHaveCount(2);

  return dialog;
}

function groupedFaceReclassifyTriggers(dialog: Locator) {
  return dialog.locator('[aria-haspopup="menu"]');
}

test.describe("FaceSelectionDialog @medium", () => {
  test("grouped recent-recognition dialog closes menu without re-popping tooltip or locking body", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }

    const dialog = await openGroupedFaceAttemptDialog(frigateApp);
    const triggers = groupedFaceReclassifyTriggers(dialog);
    await expect(triggers).toHaveCount(2);

    await triggers.first().click();

    const menu = frigateApp.page
      .locator('[role="menu"], [data-radix-menu-content]')
      .first();
    await expect(menu).toBeVisible({ timeout: 5_000 });

    await menu.getByRole("menuitem", { name: /^bob$/i }).click();

    await expect(menu).not.toBeVisible({ timeout: 3_000 });
    await expect(dialog).toBeVisible();

    // The grouped recent-recognitions flow wraps the dropdown trigger in a
    // tooltip inside the detail dialog. Focus should not jump back there.
    const visibleTooltip = await frigateApp.page
      .locator('[role="tooltip"]')
      .filter({ hasText: /train face/i })
      .isVisible()
      .catch(() => false);
    expect(
      visibleTooltip,
      "Train Face tooltip popped after dropdown closed in grouped dialog — focus-restore regression",
    ).toBe(false);
  });

  test("second grouped-image dropdown open accepts typeahead keyboard input", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }

    const dialog = await openGroupedFaceAttemptDialog(frigateApp);
    const triggers = groupedFaceReclassifyTriggers(dialog);
    await expect(triggers).toHaveCount(2);

    await triggers.first().click();
    let menu = frigateApp.page
      .locator('[role="menu"], [data-radix-menu-content]')
      .first();
    await expect(menu).toBeVisible({ timeout: 5_000 });
    await menu.getByRole("menuitem", { name: /^bob$/i }).click();
    await expect(menu).not.toBeVisible({ timeout: 3_000 });
    await expect(dialog).toBeVisible();

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

test.describe("RestartDialog @medium", () => {
  test("cancelling restart leaves body interactive", async ({ frigateApp }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/");

    // "Restart Frigate" lives in the sidebar GeneralSettings dropdown. The
    // sidebar has several aria-haspopup triggers (System, Account, etc.);
    // we open each until the Restart item is visible.
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
      const isVisible = await expect(restartItem)
        .toBeVisible({ timeout: 300 })
        .then(() => true)
        .catch(() => false);
      if (isVisible) {
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

    // Sanity: the surrounding shell is still clickable after the dialog closes.
    const postCancelTrigger = sidebarTriggers.first();
    await postCancelTrigger.click();
    await expect(
      frigateApp.page
        .locator('[role="menu"], [data-radix-menu-content]')
        .first(),
    ).toBeVisible({ timeout: 3_000 });
  });
});

test.describe("Nested overlay invariant @medium", () => {
  test("closing review filter popover leaves body interactive", async ({
    frigateApp,
  }) => {
    if (frigateApp.isMobile) {
      test.skip();
      return;
    }
    await frigateApp.goto("/review");

    const camerasBtn = frigateApp.page
      .getByRole("button", { name: /cameras/i })
      .first();
    await expect(camerasBtn).toBeVisible({ timeout: 5_000 });

    await camerasBtn.click();

    const overlay = frigateApp.page
      .locator(
        '[role="menu"], [role="dialog"], [data-radix-popper-content-wrapper]',
      )
      .first();
    await expect(overlay).toBeVisible({ timeout: 3_000 });

    await frigateApp.page.keyboard.press("Escape");
    await expect(overlay).not.toBeVisible({ timeout: 3_000 });
    await waitForBodyInteractive(frigateApp.page);
    await expectBodyInteractive(frigateApp.page);
  });
});

test.describe("Mobile face library overlay @medium @mobile", () => {
  test("mobile library selector dropdown closes cleanly", async ({
    frigateApp,
  }) => {
    if (!frigateApp.isMobile) {
      test.skip();
      return;
    }

    // The library collection selector is a Radix DropdownMenu on both
    // desktop and mobile — a direct consumer of react-dismissable-layer.
    // This exercises the dedupe'd cleanup path on mobile viewport.
    await installGroupedFaceAttemptData(frigateApp);
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
