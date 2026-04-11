import { test, expect } from "../fixtures/frigate-test";

test.describe("Export Page - Overview @high", () => {
  test("renders uncategorized exports and case cards from mock data", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/export");

    await expect(
      frigateApp.page.getByText("Front Door - Person Alert"),
    ).toBeVisible();
    await expect(
      frigateApp.page.getByText("Garage - In Progress"),
    ).toBeVisible();
    await expect(
      frigateApp.page.getByText("Package Theft Investigation"),
    ).toBeVisible();
  });

  test("search filters uncategorized exports", async ({ frigateApp }) => {
    await frigateApp.goto("/export");

    const searchInput = frigateApp.page.getByPlaceholder(/search/i).first();
    await searchInput.fill("Front Door");

    await expect(
      frigateApp.page.getByText("Front Door - Person Alert"),
    ).toBeVisible();
    await expect(
      frigateApp.page.getByText("Backyard - Car Detection"),
    ).toBeHidden();
    await expect(
      frigateApp.page.getByText("Garage - In Progress"),
    ).toBeHidden();
  });

  test("new case button opens the create case dialog", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/export");

    await frigateApp.page.getByRole("button", { name: "New Case" }).click();

    await expect(
      frigateApp.page.getByRole("dialog").filter({ hasText: "Create Case" }),
    ).toBeVisible();
    await expect(frigateApp.page.getByPlaceholder("Case name")).toBeVisible();
  });
});

test.describe("Export Page - Case Detail @high", () => {
  test("opening a case shows its detail view and associated export", async ({
    frigateApp,
  }) => {
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
    await expect(
      frigateApp.page.getByRole("button", { name: "Add Export" }),
    ).toBeVisible();
    await expect(
      frigateApp.page.getByRole("button", { name: "Edit Case" }),
    ).toBeVisible();
    await expect(
      frigateApp.page.getByRole("button", { name: "Delete Case" }),
    ).toBeVisible();
  });

  test("edit case opens a prefilled dialog", async ({ frigateApp }) => {
    await frigateApp.goto("/export");

    await frigateApp.page
      .getByText("Package Theft Investigation")
      .first()
      .click();
    await frigateApp.page.getByRole("button", { name: "Edit Case" }).click();

    const dialog = frigateApp.page
      .getByRole("dialog")
      .filter({ hasText: "Edit Case" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("input")).toHaveValue(
      "Package Theft Investigation",
    );
    await expect(dialog.locator("textarea")).toHaveValue(
      "Review of suspicious activity near the front porch",
    );
  });

  test("add export shows uncategorized exports for assignment", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/export");

    await frigateApp.page
      .getByText("Package Theft Investigation")
      .first()
      .click();
    await frigateApp.page.getByRole("button", { name: "Add Export" }).click();

    const dialog = frigateApp.page
      .getByRole("dialog")
      .filter({ hasText: "Add Export to Package Theft Investigation" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Front Door - Person Alert")).toBeVisible();
    await expect(dialog.getByText("Garage - In Progress")).toBeVisible();
  });

  test("delete case opens a confirmation dialog", async ({ frigateApp }) => {
    await frigateApp.goto("/export");

    await frigateApp.page
      .getByText("Package Theft Investigation")
      .first()
      .click();
    await frigateApp.page.getByRole("button", { name: "Delete Case" }).click();

    const dialog = frigateApp.page
      .getByRole("alertdialog")
      .filter({ hasText: "Delete Case" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Package Theft Investigation/)).toBeVisible();
  });
});

test.describe("Export Page - Empty State @high", () => {
  test("renders the empty state when there are no exports or cases", async ({
    frigateApp,
  }) => {
    await frigateApp.page.route("**/api/export**", (route) =>
      route.fulfill({ json: [] }),
    );
    await frigateApp.page.route("**/api/exports**", (route) =>
      route.fulfill({ json: [] }),
    );
    await frigateApp.page.route("**/api/cases", (route) =>
      route.fulfill({ json: [] }),
    );
    await frigateApp.page.route("**/api/cases**", (route) =>
      route.fulfill({ json: [] }),
    );

    await frigateApp.goto("/export");

    await expect(frigateApp.page.getByText("No exports found")).toBeVisible();
  });
});

test.describe("Export Page - Mobile @high @mobile", () => {
  test("mobile can open an export preview dialog", async ({ frigateApp }) => {
    test.skip(!frigateApp.isMobile, "Mobile-only assertion");

    await frigateApp.goto("/export");

    await frigateApp.page
      .getByText("Front Door - Person Alert")
      .first()
      .click();

    const dialog = frigateApp.page
      .getByRole("dialog")
      .filter({ hasText: "Front Door - Person Alert" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("video")).toBeVisible();
  });
});
