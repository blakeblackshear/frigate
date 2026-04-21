/**
 * Explore page tests -- HIGH tier.
 *
 * Search input, Enter submission, camera filter popover (desktop),
 * event grid rendering with mocked events, mobile filter drawer.
 *
 * DEVIATION NOTES (from original plan):
 *
 * 1. Search input: InputWithTags is only rendered when
 *    config.semantic_search.enabled is true. Tests that exercise the search
 *    input override the config accordingly, using model:"genai" (not in the
 *    JINA_EMBEDDING_MODELS list) so the page skips local model-state checks
 *    and renders without waiting for model-download WS messages.
 *
 * 2. Filter buttons (Cameras, Labels, More Filters): SearchFilterGroup is
 *    only rendered when hasExistingSearch is true. Tests navigate with a URL
 *    param (?labels=person) to surface the filter bar.
 *
 * 3. Cameras button: accessible name is "Cameras Filter" (aria-label), not
 *    "All Cameras" (inner text). Use getByLabel("Cameras Filter").
 *
 * 4. Labels: button accessible name is "Labels" (aria-label). With
 *    ?labels=person, the text shows "Person" rather than "All Labels".
 *    Use getByLabel("Labels").
 *
 * 5. Sub-labels / Zones: These live inside the "More Filters" dialog
 *    (SearchFilterDialog), not as standalone top-level buttons. The Zones
 *    test opens "More Filters" and asserts zone content from config.
 *
 * 6. similarity_search_id URL param: This param does not exist in the app.
 *    The correct entrypoint for similarity search is
 *    ?search_type=similarity&event_id=<id>. The test uses this URL and
 *    polls for the resulting API request.
 */

import { test, expect } from "../fixtures/frigate-test";

// Semantic search config override used by multiple tests. Using model:
// "genai" (not in JINA_EMBEDDING_MODELS) sets isGenaiEmbeddings=true, which
// skips local model-state checks and lets the page render without waiting for
// individual model download WS messages. The WS mocker returns a completed
// reindexState so !reindexState is false and the loading gate clears.
const SEMANTIC_SEARCH_CONFIG = {
  semantic_search: { enabled: true, model: "genai" },
} as const;

// ---------------------------------------------------------------------------
// Search input (semantic_search must be enabled)
// ---------------------------------------------------------------------------

test.describe("Explore — search @high", () => {
  test("search input accepts text and clears", async ({ frigateApp }) => {
    // Enable semantic search so InputWithTags renders.
    await frigateApp.installDefaults({ config: SEMANTIC_SEARCH_CONFIG });
    await frigateApp.goto("/explore");
    const searchInput = frigateApp.page.locator("input").first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await searchInput.fill("person");
    await expect(searchInput).toHaveValue("person");
    await searchInput.fill("");
    await expect(searchInput).toHaveValue("");
  });

  test("Enter submission does not crash the page", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ config: SEMANTIC_SEARCH_CONFIG });
    await frigateApp.goto("/explore");
    const searchInput = frigateApp.page.locator("input").first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await searchInput.fill("car in driveway");
    await searchInput.press("Enter");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Filter bar — desktop only
// Filter buttons appear once hasExistingSearch is true (URL params present).
// ---------------------------------------------------------------------------

test.describe("Explore — filters (desktop) @high", () => {
  test.skip(({ frigateApp }) => frigateApp.isMobile, "Desktop popovers");

  test("Cameras popover lists configured cameras", async ({ frigateApp }) => {
    // Navigate with a labels filter param so the filter bar renders.
    await frigateApp.goto("/explore?labels=person");
    // CamerasFilterButton has aria-label="Cameras Filter". Use getByLabel to
    // match against the accessible name (not the inner "All Cameras" text).
    const camerasBtn = frigateApp.page.getByLabel("Cameras Filter").first();
    await expect(camerasBtn).toBeVisible({ timeout: 10_000 });
    await camerasBtn.click();
    // DropdownMenu on desktop wraps content in data-radix-popper-content-wrapper.
    const popover = frigateApp.page.locator(
      "[data-radix-popper-content-wrapper]",
    );
    await expect(popover.first()).toBeVisible({ timeout: 3_000 });
    await expect(frigateApp.page.getByText("Front Door")).toBeVisible();
  });

  test("Labels filter lists labels from config", async ({ frigateApp }) => {
    // Navigate with an existing search so the filter bar renders.
    await frigateApp.goto("/explore?labels=person");
    // GeneralFilterButton has aria-label="Labels". With ?labels=person the
    // button text shows "Person" (the selected label), but the aria-label
    // remains "Labels".
    const labelsBtn = frigateApp.page.getByLabel("Labels").first();
    await expect(labelsBtn).toBeVisible({ timeout: 10_000 });
    await labelsBtn.click();
    // PlatformAwareDialog renders on desktop as a dropdown/popover overlay.
    const overlay = frigateApp.page.locator(
      "[data-radix-popper-content-wrapper], [role='dialog'], [data-state='open']",
    );
    await expect(overlay.first()).toBeVisible({ timeout: 3_000 });
    // "person" is already selected (it's in the URL); assert it appears in
    // the overlay content.
    await expect(overlay.first().getByText(/person/i)).toBeVisible();
    await frigateApp.page.keyboard.press("Escape");
  });

  test("Sub-labels filter renders inside More Filters dialog", async ({
    frigateApp,
  }) => {
    // Sub-labels live inside SearchFilterDialog ("More Filters" button).
    // With sub_labels mocked as [], the section still renders its heading.
    await frigateApp.page.route("**/api/sub_labels**", (route) =>
      route.fulfill({ json: [] }),
    );
    await frigateApp.goto("/explore?labels=person");
    const moreBtn = frigateApp.page.getByLabel("More Filters").first();
    await expect(moreBtn).toBeVisible({ timeout: 10_000 });
    await moreBtn.click();
    const overlay = frigateApp.page.locator(
      "[data-radix-popper-content-wrapper], [role='dialog'], [data-state='open']",
    );
    await expect(overlay.first()).toBeVisible({ timeout: 3_000 });
    // "Sub Labels" section heading always renders inside the dialog.
    await expect(
      frigateApp.page.getByText(/sub.?label/i).first(),
    ).toBeVisible();
    await frigateApp.page.keyboard.press("Escape");
  });

  test("Zones filter lists configured zones inside More Filters dialog", async ({
    frigateApp,
  }) => {
    // Override config to guarantee a known zone on front_door.
    await frigateApp.installDefaults({
      config: {
        cameras: {
          front_door: {
            zones: {
              front_yard: { coordinates: "0.1,0.1,0.9,0.1,0.9,0.9,0.1,0.9" },
            },
          },
        },
      },
    });
    await frigateApp.goto("/explore?labels=person");
    const moreBtn = frigateApp.page.getByLabel("More Filters").first();
    await expect(moreBtn).toBeVisible({ timeout: 10_000 });
    await moreBtn.click();
    const overlay = frigateApp.page.locator(
      "[data-radix-popper-content-wrapper], [role='dialog'], [data-state='open']",
    );
    await expect(overlay.first()).toBeVisible({ timeout: 3_000 });
    await expect(frigateApp.page.getByText(/front.?yard/i)).toBeVisible();
    await frigateApp.page.keyboard.press("Escape");
  });
});

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

test.describe("Explore — content @high", () => {
  test("page renders with mock events", async ({ frigateApp }) => {
    await frigateApp.goto("/explore");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      frigateApp.page.locator("#pageRoot button").first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("empty events renders without crash", async ({ frigateApp }) => {
    await frigateApp.installDefaults({ events: [] });
    await frigateApp.goto("/explore");
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("search fires a /api/events request with the query", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ config: SEMANTIC_SEARCH_CONFIG });
    const eventsRequests: string[] = [];
    frigateApp.page.on("request", (req) => {
      const url = req.url();
      if (/\/api\/events/.test(url)) eventsRequests.push(url);
    });
    await frigateApp.goto("/explore");
    const searchInput = frigateApp.page.locator("input").first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    const before = eventsRequests.length;
    await searchInput.fill("person in driveway");
    await searchInput.press("Enter");
    await expect
      .poll(() => eventsRequests.length > before, { timeout: 5_000 })
      .toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Similarity search URL param
// ---------------------------------------------------------------------------

test.describe("Explore — similarity search (desktop) @high", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Similarity trigger is hover-based; desktop-focused",
  );

  test("URL similarity search params fetch events", async ({ frigateApp }) => {
    const eventsRequests: string[] = [];
    frigateApp.page.on("request", (req) => {
      const url = req.url();
      if (/\/api\/events/.test(url)) eventsRequests.push(url);
    });
    // The app uses search_type=similarity&event_id=<id> (not
    // similarity_search_id). This exercises the same similarity search code
    // path as clicking "Find Similar" on a thumbnail.
    // Use a valid event-id format (timestamp.fractional-alphanumeric).
    await frigateApp.goto(
      "/explore?search_type=similarity&event_id=1712412000.000000-abc123",
    );
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible({
      timeout: 10_000,
    });
    // Poll to allow any pending SWR fetch to complete and be captured.
    await expect
      .poll(() => eventsRequests.length, { timeout: 5_000 })
      .toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Mobile
// ---------------------------------------------------------------------------

test.describe("Explore — mobile @high @mobile", () => {
  test.skip(({ frigateApp }) => !frigateApp.isMobile, "Mobile-only");

  test("search input is focusable at mobile viewport", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({ config: SEMANTIC_SEARCH_CONFIG });
    await frigateApp.goto("/explore");
    const searchInput = frigateApp.page.locator("input").first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await searchInput.focus();
    await expect(searchInput).toBeFocused();
  });
});
