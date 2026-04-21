/**
 * Classification page tests -- MEDIUM tier.
 *
 * Model list driven by config.classification.custom + per-model
 * dataset fetches. Admin-only access.
 */

import { test, expect } from "../fixtures/frigate-test";
import { viewerProfile } from "../fixtures/mock-data/profile";

const CUSTOM_MODELS = {
  object_classifier: {
    name: "object_classifier",
    object_config: { objects: ["person"], classification_type: "sub_label" },
  },
  state_classifier: {
    name: "state_classifier",
    state_config: { cameras: { front_door: { crop: [0, 0, 1, 1] } } },
  },
};

async function installDatasetRoute(
  app: { page: import("@playwright/test").Page },
  name: string,
  body: Record<string, unknown> = { categories: {} },
) {
  await app.page.route(
    new RegExp(`/api/classification/${name}/dataset`),
    (route) => route.fulfill({ json: body }),
  );
}

async function installTrainRoute(
  app: { page: import("@playwright/test").Page },
  name: string,
) {
  await app.page.route(
    new RegExp(`/api/classification/${name}/train`),
    (route) => route.fulfill({ json: [] }),
  );
}

test.describe("Classification — model list @medium", () => {
  test("custom models render by name", async ({ frigateApp }) => {
    await frigateApp.installDefaults({
      config: { classification: { custom: CUSTOM_MODELS } },
    });
    await installDatasetRoute(frigateApp, "object_classifier");
    await installDatasetRoute(frigateApp, "state_classifier");
    await frigateApp.goto("/classification");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
    await expect(frigateApp.page.getByText("object_classifier")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("empty custom map renders without crash", async ({ frigateApp }) => {
    await frigateApp.installDefaults({
      config: { classification: { custom: {} } },
    });
    await frigateApp.goto("/classification");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("toggling to states view switches the rendered card set", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      config: { classification: { custom: CUSTOM_MODELS } },
    });
    await installDatasetRoute(frigateApp, "object_classifier");
    await installDatasetRoute(frigateApp, "state_classifier");
    await frigateApp.goto("/classification");
    // Objects is default — object_classifier visible, state_classifier hidden.
    await expect(frigateApp.page.getByText("object_classifier")).toBeVisible({
      timeout: 10_000,
    });
    await expect(frigateApp.page.getByText("state_classifier")).toHaveCount(0);

    // Click the "states" toggle. Radix ToggleGroup type="single" uses role="radio".
    const statesToggle = frigateApp.page
      .getByRole("radio", { name: /state/i })
      .first();
    await expect(statesToggle).toBeVisible({ timeout: 5_000 });
    await statesToggle.click();

    await expect(frigateApp.page.getByText("state_classifier")).toBeVisible({
      timeout: 5_000,
    });
    await expect(frigateApp.page.getByText("object_classifier")).toHaveCount(0);
  });
});

test.describe("Classification — model detail navigation @medium", () => {
  test("clicking a model card opens ModelTrainingView", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      config: { classification: { custom: CUSTOM_MODELS } },
    });
    await installDatasetRoute(frigateApp, "object_classifier");
    await installDatasetRoute(frigateApp, "state_classifier");
    await installTrainRoute(frigateApp, "object_classifier");
    await frigateApp.goto("/classification");

    const objectCard = frigateApp.page.getByText("object_classifier").first();
    await expect(objectCard).toBeVisible({ timeout: 10_000 });
    await objectCard.click();

    // ModelTrainingView renders a Back button (aria-label "Back").
    // useOverlayState stores the selected model in window.history.state
    // (not the URL), so we verify the state transition via the DOM.
    await expect(
      frigateApp.page.getByRole("button", { name: /back/i }),
    ).toBeVisible({ timeout: 5_000 });

    // The model grid is no longer shown; state_classifier card is gone.
    await expect(frigateApp.page.getByText("state_classifier")).toHaveCount(0);
  });
});

test.describe("Classification — delete model (desktop) @medium", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Delete action menu is desktop-focused",
  );

  test("deleting a model fires DELETE + PUT /config/set", async ({
    frigateApp,
  }) => {
    let deleteCalled = false;
    let configSetCalled = false;

    // installDefaults must run first because Playwright matches routes in
    // LIFO order — routes registered after installDefaults take precedence
    // over the generic catch-all registered inside it.
    await frigateApp.installDefaults({
      config: { classification: { custom: CUSTOM_MODELS } },
    });
    await installDatasetRoute(frigateApp, "object_classifier");
    await installDatasetRoute(frigateApp, "state_classifier");

    // Register spy routes after installDefaults so they win over the catch-all.
    await frigateApp.page.route(
      /\/api\/classification\/object_classifier$/,
      async (route) => {
        if (route.request().method() === "DELETE") {
          deleteCalled = true;
          await route.fulfill({ json: { success: true } });
          return;
        }
        return route.fallback();
      },
    );
    await frigateApp.page.route("**/api/config/set", async (route) => {
      if (route.request().method() === "PUT") configSetCalled = true;
      await route.fulfill({ json: { success: true, require_restart: false } });
    });
    await frigateApp.goto("/classification");
    await expect(frigateApp.page.getByText("object_classifier")).toBeVisible({
      timeout: 10_000,
    });

    // The card-level actions menu (FiMoreVertical three-dot icon) is a
    // DropdownMenuTrigger with asChild on a BlurredIconButton div.
    // Radix forwards aria-haspopup="menu" to the child element.
    // Scope the selector to the model card grid to avoid hitting the
    // settings sidebar trigger.
    const cardGrid = frigateApp.page.locator(".grid.auto-rows-max");
    await expect(cardGrid).toBeVisible({ timeout: 5_000 });
    const trigger = cardGrid.locator('[aria-haspopup="menu"]').first();
    await expect(trigger).toBeVisible({ timeout: 5_000 });
    await trigger.click();
    const deleteItem = frigateApp.page
      .getByRole("menuitem", { name: /delete/i })
      .first();
    await expect(deleteItem).toBeVisible({ timeout: 5_000 });
    await deleteItem.click();

    // Confirm the AlertDialog.
    const alert = frigateApp.page.getByRole("alertdialog");
    await expect(alert).toBeVisible({ timeout: 5_000 });
    await alert
      .getByRole("button", { name: /delete|confirm/i })
      .first()
      .click();

    await expect.poll(() => deleteCalled, { timeout: 5_000 }).toBe(true);
    await expect.poll(() => configSetCalled, { timeout: 5_000 }).toBe(true);
  });
});

test.describe("Classification — admin only @medium", () => {
  test("viewer navigating to /classification is redirected to access-denied", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ profile: viewerProfile() });
    await frigateApp.page.goto("/classification");
    await frigateApp.page.waitForSelector("#pageRoot", { timeout: 10_000 });
    await expect(frigateApp.page).toHaveURL(/\/unauthorized/, {
      timeout: 10_000,
    });
    await expect(
      frigateApp.page.getByRole("heading", {
        level: 2,
        name: /access denied/i,
      }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Classification — mobile @medium @mobile", () => {
  test.skip(({ frigateApp }) => !frigateApp.isMobile, "Mobile-only");

  test("page renders at mobile viewport", async ({ frigateApp }) => {
    await frigateApp.installDefaults({
      config: { classification: { custom: CUSTOM_MODELS } },
    });
    await installDatasetRoute(frigateApp, "object_classifier");
    await installDatasetRoute(frigateApp, "state_classifier");
    await frigateApp.goto("/classification");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible({
      timeout: 10_000,
    });
  });
});
