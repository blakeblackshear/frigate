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

  test("add export shows completed uncategorized exports for assignment", async ({
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
    // Completed, uncategorized exports are selectable
    await expect(dialog.getByText("Front Door - Person Alert")).toBeVisible();
    // In-progress exports are intentionally hidden by AssignExportDialog
    // (see Exports.tsx filteredExports) — they can't be assigned until
    // they finish, so they should not show in the picker.
    await expect(dialog.getByText("Garage - In Progress")).toBeHidden();
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

  test("delete case can also delete its exports", async ({ frigateApp }) => {
    let deleteRequestUrl: string | null = null;
    let deleteCaseCompleted = false;

    const initialCases = [
      {
        id: "case-001",
        name: "Package Theft Investigation",
        description: "Review of suspicious activity near the front porch",
        created_at: 1775407931.3863528,
        updated_at: 1775483531.3863528,
      },
    ];

    const initialExports = [
      {
        id: "export-001",
        camera: "front_door",
        name: "Front Door - Person Alert",
        date: 1775490731.3863528,
        video_path: "/exports/export-001.mp4",
        thumb_path: "/exports/export-001-thumb.jpg",
        in_progress: false,
        export_case_id: null,
      },
      {
        id: "export-002",
        camera: "backyard",
        name: "Backyard - Car Detection",
        date: 1775483531.3863528,
        video_path: "/exports/export-002.mp4",
        thumb_path: "/exports/export-002-thumb.jpg",
        in_progress: false,
        export_case_id: "case-001",
      },
      {
        id: "export-003",
        camera: "garage",
        name: "Garage - In Progress",
        date: 1775492531.3863528,
        video_path: "/exports/export-003.mp4",
        thumb_path: "/exports/export-003-thumb.jpg",
        in_progress: true,
        export_case_id: null,
      },
    ];

    await frigateApp.page.route(/\/api\/cases(?:$|\?|\/)/, async (route) => {
      const request = route.request();

      if (request.method() === "DELETE") {
        deleteRequestUrl = request.url();
        deleteCaseCompleted = true;
        return route.fulfill({ json: { success: true } });
      }

      if (request.method() === "GET") {
        return route.fulfill({
          json: deleteCaseCompleted ? [] : initialCases,
        });
      }

      return route.fallback();
    });

    await frigateApp.page.route("**/api/exports**", async (route) => {
      if (route.request().method() !== "GET") {
        return route.fallback();
      }

      return route.fulfill({
        json: deleteCaseCompleted
          ? initialExports.filter((exp) => exp.export_case_id !== "case-001")
          : initialExports,
      });
    });

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

    const deleteExportsSwitch = dialog.getByRole("switch", {
      name: "Also delete exports",
    });
    await expect(deleteExportsSwitch).toHaveAttribute("aria-checked", "false");
    await expect(
      dialog.getByText(
        "Exports will remain available as uncategorized exports.",
      ),
    ).toBeVisible();

    await deleteExportsSwitch.click();

    await expect(deleteExportsSwitch).toHaveAttribute("aria-checked", "true");
    await expect(
      dialog.getByText("All exports in this case will be permanently deleted."),
    ).toBeVisible();

    await dialog.getByRole("button", { name: /^delete$/i }).click();

    await expect
      .poll(() => deleteRequestUrl)
      .toContain("/api/cases/case-001?delete_exports=true");

    await expect(dialog).toBeHidden();
    await expect(
      frigateApp.page.getByRole("heading", {
        name: "Package Theft Investigation",
      }),
    ).toBeHidden();
    await expect(
      frigateApp.page.getByText("Backyard - Car Detection"),
    ).toBeHidden();
    await expect(
      frigateApp.page.getByText("Front Door - Person Alert"),
    ).toBeVisible();
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

test.describe("Multi-Review Export @high", () => {
  // Two alert reviews close enough to "now" to fall within the
  // default last-24-hours review window. Using numeric timestamps
  // because the TS ReviewSegment type expects numbers even though
  // the backend pydantic model serializes datetime as ISO strings —
  // the app reads these as numbers for display math.
  const now = Date.now() / 1000;
  const mockReviews = [
    {
      id: "mex-review-001",
      camera: "front_door",
      start_time: now - 600,
      end_time: now - 580,
      has_been_reviewed: false,
      severity: "alert",
      thumb_path: "/clips/front_door/mex-review-001-thumb.jpg",
      data: {
        audio: [],
        detections: ["person-001"],
        objects: ["person"],
        sub_labels: [],
        significant_motion_areas: [],
        zones: ["front_yard"],
      },
    },
    {
      id: "mex-review-002",
      camera: "backyard",
      start_time: now - 1200,
      end_time: now - 1170,
      has_been_reviewed: false,
      severity: "alert",
      thumb_path: "/clips/backyard/mex-review-002-thumb.jpg",
      data: {
        audio: [],
        detections: ["car-002"],
        objects: ["car"],
        sub_labels: [],
        significant_motion_areas: [],
        zones: ["driveway"],
      },
    },
  ];

  // 51 alert reviews, all front_door, spaced 5 minutes apart. Used by the
  // over-limit test to trigger Ctrl+A select-all and verify the Export
  // button is hidden at 51 selected.
  const oversizedReviews = Array.from({ length: 51 }, (_, i) => ({
    id: `mex-oversized-${i.toString().padStart(3, "0")}`,
    camera: "front_door",
    start_time: now - 60 * 60 - i * 300,
    end_time: now - 60 * 60 - i * 300 + 20,
    has_been_reviewed: false,
    severity: "alert",
    thumb_path: `/clips/front_door/mex-oversized-${i}-thumb.jpg`,
    data: {
      audio: [],
      detections: [`person-${i}`],
      objects: ["person"],
      sub_labels: [],
      significant_motion_areas: [],
      zones: ["front_yard"],
    },
  }));

  const mockSummary = {
    last24Hours: {
      reviewed_alert: 0,
      reviewed_detection: 0,
      total_alert: 2,
      total_detection: 0,
    },
  };

  async function routeReviews(
    page: import("@playwright/test").Page,
    reviews: unknown[],
  ) {
    // Intercept the actual `/api/review` endpoint (singular — the
    // default api-mocker only registers `/api/reviews**` (plural)
    // which does not match the real request URL).
    await page.route(/\/api\/review(\?|$)/, (route) =>
      route.fulfill({ json: reviews }),
    );
    await page.route(/\/api\/review\/summary/, (route) =>
      route.fulfill({ json: mockSummary }),
    );
  }

  test.beforeEach(async ({ frigateApp }) => {
    await routeReviews(frigateApp.page, mockReviews);
    // Empty cases list by default so the dialog defaults to "new case".
    // Individual tests override this to populate existing cases.
    await frigateApp.page.route("**/api/cases", (route) =>
      route.fulfill({ json: [] }),
    );
  });

  async function selectTwoReviews(frigateApp: {
    page: import("@playwright/test").Page;
  }) {
    // Every review card has className `review-item` on its wrapper
    // (see EventView.tsx). Cards also have data-start attributes that
    // we can key off if needed.
    const reviewItems = frigateApp.page.locator(".review-item");
    await reviewItems.first().waitFor({ state: "visible", timeout: 10_000 });

    // Meta-click the first two items to enter multi-select mode.
    // PreviewThumbnailPlayer reads e.metaKey to decide multi-select.
    await reviewItems.nth(0).click({ modifiers: ["Meta"] });
    await reviewItems.nth(1).click();
  }

  test("selecting two reviews reveals the export button", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "Desktop multi-select flow");

    await frigateApp.goto("/review");

    await selectTwoReviews(frigateApp);

    // Action group replaces the filter bar once items are selected
    await expect(frigateApp.page.getByText(/2.*selected/i)).toBeVisible({
      timeout: 5_000,
    });

    const exportButton = frigateApp.page.getByRole("button", {
      name: /export/i,
    });
    await expect(exportButton).toBeVisible();
  });

  test("clicking export opens the multi-review dialog with correct title", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "Desktop multi-select flow");

    await frigateApp.goto("/review");

    await selectTwoReviews(frigateApp);

    await frigateApp.page
      .getByRole("button", { name: /export/i })
      .first()
      .click();

    const dialog = frigateApp.page
      .getByRole("dialog")
      .filter({ hasText: /Export 2 reviews/i });
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    // The dialog uses a Select trigger for case selection (admins). The
    // default "Create new case" value is shown on the trigger and the
    // New-case inputs render directly below.
    await expect(dialog.locator("button[role='combobox']")).toBeVisible();
    await expect(dialog.getByText(/Create new case/i)).toBeVisible();
  });

  test("starting an export posts the expected payload and navigates to the case", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "Desktop multi-select flow");

    let capturedPayload: unknown = null;
    await frigateApp.page.route("**/api/exports/batch", async (route) => {
      capturedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 202,
        json: {
          export_case_id: "new-case-xyz",
          export_ids: ["front_door_a", "backyard_b"],
          results: [
            {
              camera: "front_door",
              export_id: "front_door_a",
              success: true,
              status: "queued",
              error: null,
              item_index: 0,
            },
            {
              camera: "backyard",
              export_id: "backyard_b",
              success: true,
              status: "queued",
              error: null,
              item_index: 1,
            },
          ],
        },
      });
    });

    await frigateApp.goto("/review");
    await selectTwoReviews(frigateApp);
    await frigateApp.page
      .getByRole("button", { name: /export/i })
      .first()
      .click();

    const dialog = frigateApp.page
      .getByRole("dialog")
      .filter({ hasText: /Export 2 reviews/i });
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const nameInput = dialog.locator("input").first();
    await nameInput.fill("E2E Incident");

    await dialog.getByRole("button", { name: /export 2 reviews/i }).click();

    // Wait for the POST to fire
    await expect.poll(() => capturedPayload, { timeout: 5_000 }).not.toBeNull();

    const payload = capturedPayload as {
      items: Array<{
        camera: string;
        start_time: number;
        end_time: number;
        image_path?: string;
        client_item_id?: string;
      }>;
      new_case_name?: string;
      export_case_id?: string;
    };
    expect(payload.items).toHaveLength(2);
    expect(payload.new_case_name).toBe("E2E Incident");
    // When creating a new case, we must NOT also send export_case_id —
    // the two fields are mutually exclusive on the backend.
    expect(payload.export_case_id).toBeUndefined();
    expect(payload.items.map((i) => i.camera).sort()).toEqual([
      "backyard",
      "front_door",
    ]);
    // Each item must preserve REVIEW_PADDING (4s) on the edges —
    // i.e. the padded window is 8s longer than the original review.
    // The mock reviews above have 20s and 30s raw durations, so the
    // expected padded durations are 28s and 38s.
    const paddedDurations = payload.items
      .map((i) => i.end_time - i.start_time)
      .sort((a, b) => a - b);
    expect(paddedDurations).toEqual([28, 38]);
    // Thumbnails should be passed through per item
    for (const item of payload.items) {
      expect(item.image_path).toMatch(/mex-review-\d+-thumb\.jpg$/);
    }
    expect(payload.items.map((item) => item.client_item_id)).toEqual([
      "mex-review-001",
      "mex-review-002",
    ]);

    await expect(frigateApp.page).toHaveURL(/caseId=new-case-xyz/, {
      timeout: 5_000,
    });
  });

  test("mobile opens a drawer (not a dialog) for the multi-review export flow", async ({
    frigateApp,
  }) => {
    test.skip(!frigateApp.isMobile, "Mobile-only Drawer assertion");

    await frigateApp.goto("/review");
    await selectTwoReviews(frigateApp);

    await frigateApp.page
      .getByRole("button", { name: /export/i })
      .first()
      .click();

    // On mobile the component renders a shadcn Drawer, which uses
    // role="dialog" but sets data-vaul-drawer. Desktop renders a
    // shadcn Dialog with role="dialog" but no data-vaul-drawer.
    // The title and submit button both contain "Export 2 reviews", so
    // assert each element distinctly: the title is a heading and the
    // submit button has role="button".
    const drawer = frigateApp.page.locator("[data-vaul-drawer]");
    await expect(drawer).toBeVisible({ timeout: 5_000 });
    await expect(
      drawer.getByRole("heading", { name: /Export 2 reviews/i }),
    ).toBeVisible();
    await expect(
      drawer.getByRole("button", { name: /export 2 reviews/i }),
    ).toBeVisible();
  });

  test("hides export button when more than 50 reviews are selected", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "Desktop select-all keyboard flow");

    // Override the default 2-review mock with 51 reviews before
    // navigation. Playwright matches routes last-registered-first so
    // this takes precedence over the beforeEach.
    await routeReviews(frigateApp.page, oversizedReviews);

    await frigateApp.goto("/review");

    // Wait for any review item to render before firing the shortcut
    await frigateApp.page
      .locator(".review-item")
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });

    // Ctrl+A triggers onSelectAllReviews (see EventView.tsx useKeyboardListener)
    await frigateApp.page.keyboard.press("Control+a");

    // The action group should show "51 selected" but no Export button.
    // Mark-as-reviewed is still there so the action bar is rendered.
    // Scope the "Mark as reviewed" lookup to its exact aria-label because
    // the page can render other "mark as reviewed" controls elsewhere
    // (e.g. on individual cards) that would trip strict-mode matching.
    await expect(frigateApp.page.getByText(/51.*selected/i)).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      frigateApp.page.getByRole("button", { name: "Mark as reviewed" }),
    ).toBeVisible();
    await expect(
      frigateApp.page.getByRole("button", { name: /^export$/i }),
    ).toHaveCount(0);
  });

  test("attaching to an existing case sends export_case_id without new_case_name", async ({
    frigateApp,
  }) => {
    test.skip(frigateApp.isMobile, "Desktop multi-select flow");

    // Seed one existing case so the dialog can offer the "existing" branch.
    // The fixture mocks the user as admin (adminProfile()), so useIsAdmin()
    // is true and the dialog renders the "Existing case" radio.
    await frigateApp.page.route("**/api/cases", (route) =>
      route.fulfill({
        json: [
          {
            id: "existing-case-abc",
            name: "Incident #42",
            description: "",
            created_at: now - 3600,
            updated_at: now - 3600,
          },
        ],
      }),
    );

    let capturedPayload: unknown = null;
    await frigateApp.page.route("**/api/exports/batch", async (route) => {
      capturedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 202,
        json: {
          export_case_id: "existing-case-abc",
          export_ids: ["front_door_a", "backyard_b"],
          results: [
            {
              camera: "front_door",
              export_id: "front_door_a",
              success: true,
              status: "queued",
              error: null,
              item_index: 0,
            },
            {
              camera: "backyard",
              export_id: "backyard_b",
              success: true,
              status: "queued",
              error: null,
              item_index: 1,
            },
          ],
        },
      });
    });

    await frigateApp.goto("/review");
    await selectTwoReviews(frigateApp);

    await frigateApp.page
      .getByRole("button", { name: /export/i })
      .first()
      .click();

    const dialog = frigateApp.page
      .getByRole("dialog")
      .filter({ hasText: /Export 2 reviews/i });
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Open the Case Select dropdown and pick the seeded case directly.
    // The dialog now uses a single Select listing existing cases above
    // the "Create new case" option — no radio toggle needed.
    const selectTrigger = dialog.locator("button[role='combobox']").first();
    await selectTrigger.waitFor({ state: "visible", timeout: 5_000 });
    await selectTrigger.click();

    // The dropdown portal renders outside the dialog
    await frigateApp.page.getByRole("option", { name: /Incident #42/ }).click();

    await dialog.getByRole("button", { name: /export 2 reviews/i }).click();

    await expect.poll(() => capturedPayload, { timeout: 5_000 }).not.toBeNull();

    const payload = capturedPayload as {
      items: unknown[];
      new_case_name?: string;
      new_case_description?: string;
      export_case_id?: string;
    };
    expect(payload.export_case_id).toBe("existing-case-abc");
    expect(payload.new_case_name).toBeUndefined();
    expect(payload.new_case_description).toBeUndefined();
    expect(payload.items).toHaveLength(2);

    // Navigate should hit /export. useSearchEffect consumes the caseId
    // query param and strips it once the case is found in the cases list,
    // so we assert on the path, not the query string.
    await expect(frigateApp.page).toHaveURL(/\/export(\?|$)/, {
      timeout: 5_000,
    });
  });
});
