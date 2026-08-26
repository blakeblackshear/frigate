/**
 * Setup wizard account step -- HIGH tier.
 *
 * Covers the step's placement and gating, the password and user payloads it
 * sends, the copy it shows when nobody is signed in (the internal port), and
 * that skipping it writes nothing.
 */

import { test, expect } from "../../fixtures/frigate-test";
import type { Page } from "@playwright/test";
import { installFirstRun } from "../../helpers/setup-wizard";

type Sent = {
  method: string;
  url: string;
  body: Record<string, unknown> | null;
};

async function captureUserCalls(page: Page): Promise<Sent[]> {
  const sent: Sent[] = [];

  await page.route("**/api/users**", (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      return route.fulfill({ json: [{ username: "admin", role: "admin" }] });
    }

    sent.push({
      method: request.method(),
      url: request.url(),
      body: request.postDataJSON(),
    });
    return route.fulfill({ json: { message: "ok" } });
  });

  return sent;
}

async function gotoAccountStep(page: Page) {
  await page.getByRole("button", { name: "Get Started" }).click();
  await expect(
    page.getByRole("heading", { name: "Secure your account" }),
  ).toBeVisible();
}

test.describe("setup wizard account @high @mobile", () => {
  test("sets the admin password without an old password", async ({
    frigateApp,
    page,
  }) => {
    await installFirstRun(frigateApp, page);
    const sent = await captureUserCalls(page);

    await frigateApp.gotoAndWait("/", "text=Welcome to Frigate");
    await gotoAccountStep(page);

    await page.getByRole("button", { name: "Change password" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // the dialog is in set-password mode, so it asks for no current password
    await expect(
      dialog.getByPlaceholder("Enter your current password"),
    ).toBeHidden();
    await dialog
      .getByPlaceholder("Enter new password", { exact: true })
      .fill("a-long-enough-password");
    await dialog
      .getByPlaceholder("Re-enter new password")
      .fill("a-long-enough-password");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Password set")).toBeVisible();

    const passwordCall = sent.find((call) => call.method === "PUT");
    expect(passwordCall?.url).toContain("/users/admin/password");
    // admins are exempt from the current-password check, so it must not be sent
    expect(passwordCall?.body).toEqual({ password: "a-long-enough-password" });
  });

  test("creates a user with a role", async ({ frigateApp, page }) => {
    await installFirstRun(frigateApp, page);
    const sent = await captureUserCalls(page);

    await frigateApp.gotoAndWait("/", "text=Welcome to Frigate");
    await gotoAccountStep(page);

    await page.getByRole("button", { name: "Add user" }).click();

    await page.getByPlaceholder("Enter username").fill("family");
    await page
      .getByPlaceholder("Enter password")
      .fill("a-long-enough-password");
    await page
      .getByPlaceholder("Confirm Password")
      .fill("a-long-enough-password");
    await page.getByRole("button", { name: "Save" }).click();

    const createCall = sent.find((call) => call.method === "POST");
    expect(createCall?.body).toEqual({
      username: "family",
      password: "a-long-enough-password",
      role: "viewer",
    });
  });

  test("shows anonymous copy when nobody is signed in", async ({
    frigateApp,
    page,
  }) => {
    await installFirstRun(frigateApp, page, {
      profile: { username: "anonymous", role: "admin", allowed_cameras: null },
    });
    await captureUserCalls(page);

    await frigateApp.gotoAndWait("/", "text=Welcome to Frigate");
    await gotoAccountStep(page);

    await expect(page.getByText("doesn't require a login")).toBeVisible();
    await expect(page.getByText("You're signed in as")).toBeHidden();
  });

  test("is absent when native auth is disabled", async ({
    frigateApp,
    page,
  }) => {
    await installFirstRun(frigateApp, page, {
      config: { auth: { enabled: false } } as never,
    });
    await captureUserCalls(page);

    await frigateApp.gotoAndWait("/", "text=Welcome to Frigate");
    await page.getByRole("button", { name: "Get Started" }).click();

    // straight from welcome to the camera step, with no gap in the indicator
    await expect(page.getByText("Add Your First Camera")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Secure your account" }),
    ).toBeHidden();
  });

  test("skipping sends nothing", async ({ frigateApp, page }) => {
    await installFirstRun(frigateApp, page);
    const sent = await captureUserCalls(page);

    await frigateApp.gotoAndWait("/", "text=Welcome to Frigate");
    await gotoAccountStep(page);
    await page.getByRole("button", { name: "Skip" }).click();

    await expect(page.getByText("Add Your First Camera")).toBeVisible();
    expect(sent).toHaveLength(0);
  });
  test("an account change alone needs no restart", async ({
    frigateApp,
    page,
  }) => {
    const addCamera = await installFirstRun(frigateApp, page);
    await captureUserCalls(page);

    await frigateApp.gotoAndWait("/", "text=Welcome to Frigate");
    await gotoAccountStep(page);

    await page.getByRole("button", { name: "Change password" }).click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByPlaceholder("Enter new password", { exact: true })
      .fill("a-long-enough-password");
    await dialog
      .getByPlaceholder("Re-enter new password")
      .fill("a-long-enough-password");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Password set")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();

    // the camera step has no Skip, so it is advanced the way the detector
    // helper does, by opening and cancelling the add dialog
    await expect(page.getByText("Add Your First Camera")).toBeVisible();
    await page.getByRole("button", { name: "Add Camera" }).click();
    addCamera();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("button", { name: "Next" })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "Next" }).click();

    // every remaining step is passed without writing config: Skip on the
    // detector, then Auto on hwaccel, which has nothing to derive and so
    // saves nothing, then Skip on recording
    await expect(page.getByText("Object Detection")).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.getByText("Hardware Acceleration")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Skip" }).click();

    await expect(page.getByText("You're done!")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Go to Live View" }),
    ).toBeVisible();
    await expect(
      page.getByText("Frigate needs to restart to apply your settings"),
    ).toBeHidden();
  });
});
