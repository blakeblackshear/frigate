/**
 * Replay page tests -- MEDIUM tier.
 *
 * /replay is the admin debug replay page (not a recordings player).
 * Polls /api/debug_replay/status, renders a no-session state when
 * inactive, and a live camera image + debug toggles + Stop controls
 * when active.
 */

import { test, expect } from "../fixtures/frigate-test";
import {
  activeSessionStatus,
  noSessionStatus,
} from "../fixtures/mock-data/debug-replay";

async function installStatusRoute(
  app: { page: import("@playwright/test").Page },
  body: unknown,
) {
  await app.page.route("**/api/debug_replay/status", (route) =>
    route.fulfill({ json: body }),
  );
}

test.describe("Replay — no active session @medium", () => {
  test("empty state renders heading + Go to History button", async ({
    frigateApp,
  }) => {
    await installStatusRoute(frigateApp, noSessionStatus());
    await frigateApp.goto("/replay");
    await expect(
      frigateApp.page.getByRole("heading", {
        level: 2,
        name: /No Active Replay Session/i,
      }),
    ).toBeVisible({ timeout: 10_000 });
    const goButton = frigateApp.page.getByRole("button", {
      name: /Go to History|Go to Recordings/i,
    });
    await expect(goButton).toBeVisible();
  });

  test("clicking Go to History navigates to /review", async ({
    frigateApp,
  }) => {
    await installStatusRoute(frigateApp, noSessionStatus());
    await frigateApp.goto("/replay");
    await expect(
      frigateApp.page.getByRole("heading", {
        level: 2,
        name: /No Active Replay Session/i,
      }),
    ).toBeVisible({ timeout: 10_000 });
    await frigateApp.page
      .getByRole("button", { name: /Go to History|Go to Recordings/i })
      .click();
    await expect(frigateApp.page).toHaveURL(/\/review/);
  });
});

test.describe("Replay — active session @medium", () => {
  test("active status renders the Debug Replay side panel", async ({
    frigateApp,
  }) => {
    await installStatusRoute(frigateApp, activeSessionStatus());
    await frigateApp.goto("/replay");
    await expect(
      frigateApp.page.getByRole("heading", { level: 3, name: /Debug Replay/i }),
    ).toBeVisible({ timeout: 10_000 });
    // Three tabs (Debug / Objects / Messages) in TabsList
    await expect(frigateApp.page.locator('[role="tab"]')).toHaveCount(3);
  });

  test("debug toggles render with bbox ON by default", async ({
    frigateApp,
  }) => {
    await installStatusRoute(frigateApp, activeSessionStatus());
    await frigateApp.goto("/replay");
    const bbox = frigateApp.page.locator("#debug-bbox");
    await expect(bbox).toBeVisible({ timeout: 10_000 });
    await expect(bbox).toHaveAttribute("aria-checked", "true");
  });

  test("clicking bbox toggle flips aria-checked", async ({ frigateApp }) => {
    await installStatusRoute(frigateApp, activeSessionStatus());
    await frigateApp.goto("/replay");
    const bbox = frigateApp.page.locator("#debug-bbox");
    await expect(bbox).toBeVisible({ timeout: 10_000 });
    await expect(bbox).toHaveAttribute("aria-checked", "true");
    await bbox.click();
    await expect(bbox).toHaveAttribute("aria-checked", "false");
  });

  test("Configuration button opens the configuration dialog (desktop)", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "Desktop: button has visible text label");
    await installStatusRoute(frigateApp, activeSessionStatus());
    await frigateApp.goto("/replay");
    await expect(
      frigateApp.page.getByRole("heading", { level: 3, name: /Debug Replay/i }),
    ).toBeVisible({ timeout: 10_000 });

    // On desktop the span is visible and gives the button an accessible name.
    await frigateApp.page
      .getByRole("button", { name: /configuration/i })
      .first()
      .click();

    const dialog = frigateApp.page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test("Configuration button opens the configuration dialog (mobile)", async ({
    frigateApp,
  }) => {
    test.skip(!frigateApp.isMobile, "Mobile: button is icon-only");
    await installStatusRoute(frigateApp, activeSessionStatus());
    await frigateApp.goto("/replay");
    await expect(
      frigateApp.page.getByRole("heading", { level: 3, name: /Debug Replay/i }),
    ).toBeVisible({ timeout: 10_000 });

    // On mobile the Configuration button text span is hidden (md:inline).
    // It is the first button inside the right-side action group div
    // (the flex container that holds Config + Stop, sibling of the Back button).
    const actionGroup = frigateApp.page.locator(
      ".flex.items-center.gap-2 button",
    );
    await actionGroup.first().click();

    const dialog = frigateApp.page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test("Objects tab renders with the camera_activity objects list", async ({
    frigateApp,
  }) => {
    await installStatusRoute(frigateApp, activeSessionStatus());
    await frigateApp.goto("/replay");

    await expect(
      frigateApp.page.getByRole("heading", { level: 3, name: /Debug Replay/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Send an activity payload with a person object on front_door.
    // Must be called after goto() so the WS connection is established.
    await frigateApp.ws.sendCameraActivity({
      front_door: {
        objects: [
          {
            label: "person",
            score: 0.95,
            box: [0.1, 0.1, 0.5, 0.8],
            area: 0.2,
            ratio: 0.6,
            region: [0.05, 0.05, 0.6, 0.85],
            current_zones: [],
            id: "obj-person-1",
          },
        ],
      },
    });

    // Switch to Objects tab (labelled "Object List" in i18n).
    const objectsTab = frigateApp.page.getByRole("tab", {
      name: /object/i,
    });
    await objectsTab.click();
    await expect(objectsTab).toHaveAttribute("data-state", "active", {
      timeout: 3_000,
    });

    // The object row renders the label.
    await expect(frigateApp.page.getByText(/person/i).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("Messages tab renders WsMessageFeed container", async ({
    frigateApp,
  }) => {
    await installStatusRoute(frigateApp, activeSessionStatus());
    await frigateApp.goto("/replay");
    await expect(
      frigateApp.page.getByRole("heading", { level: 3, name: /Debug Replay/i }),
    ).toBeVisible({ timeout: 10_000 });

    const messagesTab = frigateApp.page.getByRole("tab", {
      name: /messages/i,
    });
    await messagesTab.click();
    await expect(messagesTab).toHaveAttribute("data-state", "active", {
      timeout: 3_000,
    });
  });

  test("bbox info popover opens and closes cleanly", async ({ frigateApp }) => {
    await installStatusRoute(frigateApp, activeSessionStatus());
    await frigateApp.goto("/replay");
    // The bbox row has an info icon popover trigger next to its label.
    // The trigger is a div (not button) wrapping LuInfo with an sr-only
    // "Info" span. Target it by the sr-only text content.
    const infoTrigger = frigateApp.page
      .locator("span.sr-only", { hasText: /info/i })
      .first();
    await expect(infoTrigger).toBeVisible({ timeout: 10_000 });
    // Click the parent div (the actual trigger)
    await infoTrigger.locator("..").click();

    const popover = frigateApp.page.locator(
      "[data-radix-popper-content-wrapper]",
    );
    await expect(popover.first()).toBeVisible({ timeout: 3_000 });
    await frigateApp.page.keyboard.press("Escape");
    await expect(popover.first()).not.toBeVisible({ timeout: 3_000 });
  });
});

test.describe("Replay — stop flow (desktop) @medium", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Desktop button has accessible 'Stop Replay' name",
  );

  test("Stop Replay opens confirm dialog; confirm POSTs debug_replay/stop", async ({
    frigateApp,
  }) => {
    await installStatusRoute(frigateApp, activeSessionStatus());
    let stopCalled = false;
    await frigateApp.page.route("**/api/debug_replay/stop", async (route) => {
      if (route.request().method() === "POST") stopCalled = true;
      await route.fulfill({ json: { success: true } });
    });

    await frigateApp.goto("/replay");
    await expect(
      frigateApp.page.getByRole("heading", { level: 3, name: /Debug Replay/i }),
    ).toBeVisible({ timeout: 10_000 });

    await frigateApp.page
      .getByRole("button", { name: /stop replay/i })
      .first()
      .click();

    const dialog = frigateApp.page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 3_000 });
    await dialog
      .getByRole("button", { name: /stop|confirm/i })
      .first()
      .click();
    await expect.poll(() => stopCalled, { timeout: 5_000 }).toBe(true);
  });
});

test.describe("Replay — stop button (mobile) @medium @mobile", () => {
  test.skip(
    ({ frigateApp }) => !frigateApp.isMobile,
    "Mobile-only icon-button variant",
  );

  test("tapping the icon-only stop button opens the confirm dialog", async ({
    frigateApp,
  }) => {
    await installStatusRoute(frigateApp, activeSessionStatus());
    await frigateApp.goto("/replay");
    await expect(
      frigateApp.page.getByRole("heading", { level: 3, name: /Debug Replay/i }),
    ).toBeVisible({ timeout: 10_000 });

    // On mobile the Stop button is an icon (LuSquare) inside an
    // AlertDialogTrigger. It's the last button in the top bar's
    // right-side action group (Back is on the left). Target by
    // position within the top-bar flex container.
    const topRightButtons = frigateApp.page
      .locator(".min-h-12 button, .md\\:min-h-16 button")
      .filter({ hasNot: frigateApp.page.getByLabel("Back") });
    const lastButton = topRightButtons.last();
    await expect(lastButton).toBeVisible({ timeout: 10_000 });
    await lastButton.click();

    const dialog = frigateApp.page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 3_000 });
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 3_000 });
  });
});

test.describe("Replay — mobile @medium @mobile", () => {
  test.skip(({ frigateApp }) => !frigateApp.isMobile, "Mobile-only");

  test("no-session state renders at mobile viewport", async ({
    frigateApp,
  }) => {
    await installStatusRoute(frigateApp, noSessionStatus());
    await frigateApp.goto("/replay");
    await expect(
      frigateApp.page.getByRole("heading", {
        level: 2,
        name: /No Active Replay Session/i,
      }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
