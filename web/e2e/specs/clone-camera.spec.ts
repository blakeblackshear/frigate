/**
 * Camera clone dialog E2E tests.
 *
 * Covers the design invariants that don't depend on per-camera resolution
 * differences in the mock fixture:
 *   1. Dialog opens from the "Clone settings" button below Add/Delete.
 *   2. A source camera must be chosen inside the dialog before cloning.
 *   3. "Stream URLs and roles" is forced on and disabled for new-camera target.
 *   4. Cloning to a new camera issues a single add PUT and shows a restart prompt.
 *   5. The existing-camera target selects multiple destinations via a switch
 *      popover (with an "All cameras" toggle and source exclusion); the closed
 *      trigger summarizes the selection by name or as "All cameras".
 *
 * The spatial-mismatch warning path is exercised in unit-level review and via
 * manual QA — the shared mock fixture ships every camera at 1280×720. The
 * existing-camera PUT fan-out is likewise not asserted here: the mock cameras
 * are identical apart from stream URLs (which existing-camera clones never
 * copy) and the schema mock is empty, so a clone onto them produces no diff
 * and no PUT. That path is covered by unit-level review and manual QA.
 */

import { test, expect } from "../fixtures/frigate-test";

async function openCloneDialog(frigateApp: {
  page: import("@playwright/test").Page;
}) {
  await frigateApp.page
    .getByRole("button", { name: /^Clone settings$/i })
    .click();
  await expect(frigateApp.page.getByRole("dialog")).toBeVisible();
}

async function selectSource(
  frigateApp: { page: import("@playwright/test").Page },
  source: string,
) {
  await frigateApp.page.getByRole("dialog").getByRole("combobox").click();
  await frigateApp.page
    .getByRole("option", { name: source, exact: true })
    .click();
}

test.describe("Camera clone dialog @medium @mobile", () => {
  test.beforeEach(async ({ frigateApp }) => {
    await frigateApp.goto("/settings?page=cameraManagement");
    await expect(
      frigateApp.page.getByRole("heading", { name: /Manage Cameras/i }),
    ).toBeVisible();
  });

  test("opens the dialog from the Clone settings button", async ({
    frigateApp,
  }) => {
    await openCloneDialog(frigateApp);

    await expect(
      frigateApp.page.getByRole("dialog").getByText(/Clone camera settings/i),
    ).toBeVisible();

    // The Clone button is disabled until a source (and target) is chosen.
    await expect(
      frigateApp.page.getByRole("button", { name: /^Clone$/i }),
    ).toBeDisabled();
  });

  test("forces Stream URLs and roles on for new-camera target", async ({
    frigateApp,
  }) => {
    await openCloneDialog(frigateApp);
    await selectSource(frigateApp, "Front Door");

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

  test("issues a single add PUT and shows restart toast for new-camera target", async ({
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

    await openCloneDialog(frigateApp);
    await selectSource(frigateApp, "Front Door");

    const nameInput = frigateApp.page.getByPlaceholder(
      /e\.g\., back_door or Back Door/i,
    );
    await nameInput.fill("clone_target_one");

    // With a source picked and a valid name, changeCount > 0 enables Clone.
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

  test("selects multiple existing destination cameras via a switch popover", async ({
    frigateApp,
  }) => {
    await openCloneDialog(frigateApp);
    await selectSource(frigateApp, "Front Door");

    await frigateApp.page
      .getByRole("radio", { name: /Existing cameras/i })
      .click();

    const dialog = frigateApp.page.getByRole("dialog");

    // The destination trigger starts with the empty-selection placeholder.
    await dialog
      .getByRole("button", { name: /Select at least one camera/i })
      .click();

    // The chosen source is excluded from the destination switch list.
    await expect(
      dialog.getByRole("switch", { name: /Backyard/i }),
    ).toBeVisible();
    await expect(dialog.getByRole("switch", { name: /Garage/i })).toBeVisible();
    await expect(
      dialog.getByRole("switch", { name: /^Front Door$/i }),
    ).toHaveCount(0);

    // Selecting a single camera summarizes by name once the popover closes.
    await dialog.getByRole("switch", { name: /Backyard/i }).click();
    await frigateApp.page.keyboard.press("Escape");
    await expect(
      dialog.getByRole("button", { name: /^Backyard$/i }),
    ).toBeVisible();

    // Reopen and select everything; the trigger collapses to "All cameras".
    await dialog.getByRole("button", { name: /^Backyard$/i }).click();
    await dialog.getByRole("switch", { name: /^All cameras$/i }).click();
    await frigateApp.page.keyboard.press("Escape");
    await expect(
      dialog.getByRole("button", { name: /^All cameras$/i }),
    ).toBeVisible();
  });
});
