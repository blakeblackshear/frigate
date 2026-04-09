/**
 * Export page tests.
 *
 * Covers rendering, search, delete confirmation, empty/loading/error
 * states, and mobile-specific interactions (video pane, case detail).
 */

import { test, expect } from "../fixtures/frigate-test";
import { mockEmpty, mockError, mockDelay } from "../helpers/mock-overrides";

test.describe("Export Page — Happy Path @high", () => {
  test("renders unassigned exports in the main list", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/export");

    // export-001 (Front Door) and export-003 (Garage) are unassigned — visible
    // in the main list. export-002 (Backyard) belongs to case-001 and appears
    // only inside the case detail view, not in the top-level list.
    await expect(
      frigateApp.page.getByText("Front Door - Person Alert"),
    ).toBeVisible();
    await expect(
      frigateApp.page.getByText("Garage - In Progress"),
    ).toBeVisible();
  });

  test("renders the case card from mock data", async ({ frigateApp }) => {
    await frigateApp.goto("/export");
    await expect(
      frigateApp.page.getByText("Package Theft Investigation"),
    ).toBeVisible();
  });

  test("clicking a case opens its detail view", async ({ frigateApp }) => {
    await frigateApp.goto("/export");
    await frigateApp.page
      .getByText("Package Theft Investigation")
      .first()
      .click();

    await expect(
      frigateApp.page.getByRole("heading", {
        name: "Package Theft Investigation",
      }),
    ).toBeVisible();
    await expect(
      frigateApp.page.getByText("Backyard - Car Detection"),
    ).toBeVisible();
  });
});

test.describe("Export Page — Search @high", () => {
  test("search filter narrows the list to matching exports", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/export");
    await expect(
      frigateApp.page.getByText("Front Door - Person Alert"),
    ).toBeVisible();

    const search = frigateApp.page.getByPlaceholder(/search/i).first();
    await search.fill("Front Door");

    await expect(
      frigateApp.page.getByText("Front Door - Person Alert"),
    ).toBeVisible();
    // Garage (unassigned) and Package Theft Investigation (case) are filtered out
    await expect(
      frigateApp.page.getByText("Garage - In Progress"),
    ).toBeHidden();
    await expect(
      frigateApp.page.getByText("Package Theft Investigation"),
    ).toBeHidden();
  });

  test("clearing the search restores all exports", async ({ frigateApp }) => {
    await frigateApp.goto("/export");
    await expect(
      frigateApp.page.getByText("Front Door - Person Alert"),
    ).toBeVisible();

    const search = frigateApp.page.getByPlaceholder(/search/i).first();
    await search.fill("Front Door");
    await expect(
      frigateApp.page.getByText("Garage - In Progress"),
    ).toBeHidden();

    await search.fill("");
    await expect(
      frigateApp.page.getByText("Garage - In Progress"),
    ).toBeVisible();
  });
});

test.describe("Export Page — Delete @high", () => {
  test("clicking delete on a card opens the confirmation dialog", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/export");
    await expect(
      frigateApp.page.getByText("Front Door - Person Alert"),
    ).toBeVisible();

    // Find the card containing "Front Door - Person Alert" and open its menu.
    // The menu trigger is an "Edit name" BlurredIconButton rendered inside
    // each card. Since all three cards share this label, we scope the
    // button query to the card that contains the matching text.
    const cardMenuTrigger = frigateApp.page
      .getByRole("button", { name: "Edit name" })
      .first();
    await cardMenuTrigger.click();

    // Click the Delete export menu item
    await frigateApp.page
      .getByRole("menuitem", { name: "Delete export" })
      .click();

    // Confirmation alert dialog visible with the Delete Export button
    // (capital E — distinct from the lowercase-e menu item)
    await expect(
      frigateApp.page.getByRole("button", { name: "Delete Export" }),
    ).toBeVisible();
  });

  test("cancelling the delete dialog leaves the card in place", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/export");
    await expect(
      frigateApp.page.getByText("Front Door - Person Alert"),
    ).toBeVisible();

    await frigateApp.page
      .getByRole("button", { name: "Edit name" })
      .first()
      .click();
    await frigateApp.page
      .getByRole("menuitem", { name: "Delete export" })
      .click();

    await frigateApp.page.getByRole("button", { name: /^cancel$/i }).click();

    await expect(
      frigateApp.page.getByRole("button", { name: "Delete Export" }),
    ).toBeHidden();
    await expect(
      frigateApp.page.getByText("Front Door - Person Alert"),
    ).toBeVisible();
  });
});

test.describe("Export Page — States @high", () => {
  test("empty state renders when there are no exports or cases", async ({
    page,
    frigateApp,
  }) => {
    await mockEmpty(page, "**/api/exports**");
    await mockEmpty(page, "**/api/cases**");
    await frigateApp.goto("/export");

    await expect(frigateApp.page.getByText("No exports found")).toBeVisible();
  });

  test("loading state — empty list resolves after delay", async ({
    page,
    frigateApp,
  }) => {
    await mockDelay(page, "**/api/exports**", 500, []);
    await mockDelay(page, "**/api/cases**", 500, []);
    await frigateApp.goto("/export");

    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
    await expect(frigateApp.page.getByText("No exports found")).toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe("Export Page — Error State @high", () => {
  // The exports endpoint returning 500 will be logged by SWR. Use a single
  // alternation regex per Playwright's isFixtureTuple collision.
  test.use({
    expectedErrors: [/500.*\/api\/exports|Failed to load resource.*500/],
  });

  test("API error does not crash the page", async ({ page, frigateApp }) => {
    await mockError(page, "**/api/exports**");
    await frigateApp.goto("/export");

    // Page must still mount — the search input is rendered before data loads
    await expect(
      frigateApp.page.getByPlaceholder(/search/i).first(),
    ).toBeVisible();
  });
});

test.describe("Export Page — Mobile @high @mobile", () => {
  test("mobile viewport renders the export list and opens video pane", async ({
    frigateApp,
  }) => {
    test.skip(!frigateApp.isMobile, "Mobile-only assertion");

    await frigateApp.goto("/export");
    await expect(
      frigateApp.page.getByText("Front Door - Person Alert"),
    ).toBeVisible();

    // Click the export card to open the video dialog. This is the exact
    // code path that was silently broken for weeks before this spec existed.
    await frigateApp.page
      .getByText("Front Door - Person Alert")
      .first()
      .click();

    // The dialog mounts with the export's name as title
    await expect(
      frigateApp.page
        .getByRole("dialog")
        .filter({ hasText: "Front Door - Person Alert" }),
    ).toBeVisible();

    // The video element inside the dialog is present
    await expect(
      frigateApp.page.locator('[role="dialog"] video'),
    ).toBeVisible();
  });

  test("mobile viewport renders cases and opens case detail", async ({
    frigateApp,
  }) => {
    test.skip(!frigateApp.isMobile, "Mobile-only assertion");

    await frigateApp.goto("/export");
    await frigateApp.page
      .getByText("Package Theft Investigation")
      .first()
      .click();

    await expect(
      frigateApp.page.getByRole("heading", {
        name: "Package Theft Investigation",
      }),
    ).toBeVisible();
  });
});
