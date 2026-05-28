/**
 * Camera clone dialog E2E tests.
 *
 * Covers the design invariants that don't depend on per-camera resolution
 * differences in the mock fixture:
 *   1. Dialog opens from the Clone button on a camera row.
 *   2. "Stream URLs and roles" is forced on and disabled for new-camera target.
 *   3. Clicking Clone issues a PUT and shows a restart prompt.
 *
 * The spatial-mismatch warning path is exercised in unit-level review and
 * via manual QA — the shared mock fixture ships every camera at 1280×720,
 * so an E2E assertion for that path would silently pass without coverage.
 */

import { test, expect } from "../fixtures/frigate-test";

const CLONE_BUTTON_ARIA_PREFIX = "Clone settings from";
const DIALOG_TITLE_PREFIX = "Clone settings from";

test.describe("Camera clone dialog @medium @mobile", () => {
  test.beforeEach(async ({ frigateApp }) => {
    await frigateApp.goto("/settings?page=cameraManagement");
    await expect(
      frigateApp.page.getByRole("heading", { name: /Manage Cameras/i }),
    ).toBeVisible();
  });

  test("opens the dialog from a camera row's Clone button", async ({
    frigateApp,
  }) => {
    const cloneButton = frigateApp.page
      .getByRole("button", { name: new RegExp(CLONE_BUTTON_ARIA_PREFIX, "i") })
      .first();
    await cloneButton.click();

    await expect(frigateApp.page.getByRole("dialog")).toBeVisible();
    await expect(
      frigateApp.page
        .getByRole("dialog")
        .getByText(new RegExp(DIALOG_TITLE_PREFIX, "i")),
    ).toBeVisible();
  });

  test("forces Stream URLs and roles on for new-camera target", async ({
    frigateApp,
  }) => {
    const cloneButton = frigateApp.page
      .getByRole("button", { name: new RegExp(CLONE_BUTTON_ARIA_PREFIX, "i") })
      .first();
    await cloneButton.click();

    await expect(frigateApp.page.getByRole("dialog")).toBeVisible();

    // The "New camera" radio is selected by default; the Streams group renders
    // the ffmpeg_live checkbox as forced-checked and disabled.
    const streamsLabel = frigateApp.page
      .locator("label")
      .filter({ hasText: /Stream URLs and roles/i });
    await expect(streamsLabel).toBeVisible();

    const streamsCheckbox = streamsLabel.getByRole("checkbox");
    await expect(streamsCheckbox).toBeChecked();
    await expect(streamsCheckbox).toBeDisabled();
  });

  test("issues a PUT and shows restart toast for new-camera target", async ({
    frigateApp,
  }) => {
    const requests: { body: unknown }[] = [];

    await frigateApp.page.route("**/api/config/set", async (route) => {
      const body = route.request().postDataJSON();
      requests.push({ body });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, require_restart: false }),
      });
    });

    await frigateApp.goto("/settings?page=cameraManagement");
    await expect(
      frigateApp.page.getByRole("heading", { name: /Manage Cameras/i }),
    ).toBeVisible();

    const cloneButton = frigateApp.page
      .getByRole("button", { name: new RegExp(CLONE_BUTTON_ARIA_PREFIX, "i") })
      .first();
    await cloneButton.click();

    await expect(frigateApp.page.getByRole("dialog")).toBeVisible();

    const nameInput = frigateApp.page.getByPlaceholder(
      /e\.g\., back_door or Back Door/i,
    );
    await nameInput.fill("clone_target_one");

    // After typing a valid name, the Clone button becomes enabled because
    // changeCount > 0 (the dialog's previewPayloads memo watches the name).
    await expect(
      frigateApp.page.getByRole("button", { name: /^Clone$/i }),
    ).toBeEnabled({ timeout: 5_000 });

    await frigateApp.page.getByRole("button", { name: /^Clone$/i }).click();

    // New-camera clones bundle into a single atomic add PUT (avoids
    // per-section validation ordering issues).
    await expect.poll(() => requests.length, { timeout: 10_000 }).toBe(1);

    const firstBody = requests[0].body as {
      requires_restart?: number;
      update_topic?: string;
    };
    expect(firstBody.update_topic).toMatch(
      /config\/cameras\/clone_target_one\/add/,
    );
    expect(firstBody.requires_restart).toBe(1);

    // The toast offers a Restart action because new-camera always needs restart.
    // .first() avoids strict-mode rejection when both the toast action and the
    // RestartDialog trigger render concurrently.
    await expect(
      frigateApp.page.getByRole("button", { name: /Restart/i }).first(),
    ).toBeVisible({ timeout: 8_000 });
  });
});
