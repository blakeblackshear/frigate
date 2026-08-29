/**
 * Masonry live grid -- custom-group draggable layout.
 *
 * Verifies natural-aspect tile sizing and that a saved layout the current
 * version cannot read is regenerated cleanly. The grid renders only for a
 * custom camera group (here: "outdoor") on desktop; mobile keeps the static
 * grid, which the @mobile block below guards.
 */

import { test, expect } from "../fixtures/frigate-test";
import { LivePage } from "../pages/live.page";
import {
  cameraBoxes,
  persistedLayoutKey,
  readLayout,
  seedLayout,
} from "../helpers/grid-layout";

const GROUP = "outdoor"; // custom group: front_door + backyard

test.describe("Masonry live grid @critical", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Draggable masonry grid is desktop-only",
  );

  test("custom group renders its cameras in the draggable grid", async ({
    frigateApp,
  }) => {
    await frigateApp.goto(`/?group=${GROUP}`);
    const live = new LivePage(frigateApp.page, true);
    await expect(live.cameraCard("front_door").first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(live.cameraCard("backyard").first()).toBeVisible();
  });

  test("tiles render at their camera's natural aspect ratio", async ({
    frigateApp,
  }) => {
    // front_door stays 16:9; backyard is overridden to portrait so the two
    // tiles must render with opposite orientations.
    await frigateApp.installDefaults({
      config: {
        cameras: { backyard: { detect: { width: 720, height: 1280 } } },
      },
    });
    await frigateApp.goto(`/?group=${GROUP}`);
    const live = new LivePage(frigateApp.page, true);

    await expect(live.cameraCard("front_door").first()).toBeVisible({
      timeout: 10_000,
    });

    const { front_door: landscape, backyard: portrait } = await cameraBoxes(
      frigateApp.page,
      ["front_door", "backyard"] as const,
      "card",
    );

    // 16:9 tile is clearly wider than tall; portrait tile is taller than wide.
    expect(landscape.w / landscape.h).toBeGreaterThan(1.4);
    expect(portrait.w / portrait.h).toBeLessThan(1);
  });

  test("dragging a tile does not shove other tiles far away", async ({
    frigateApp,
  }) => {
    await frigateApp.goto(`/?group=${GROUP}`);
    const live = new LivePage(frigateApp.page, true);
    await expect(live.cameraCard("front_door").first()).toBeVisible({
      timeout: 10_000,
    });

    await live.editLayoutButton.click();

    const cameras = ["front_door", "backyard"] as const;
    const { front_door: fixedBefore, backyard: draggedBox } = await cameraBoxes(
      frigateApp.page,
      cameras,
      "card",
    );

    // Drag backyard onto front_door's position (a deliberate collision). With
    // free-placement + prevent-collision, front_door must NOT be shoved down.
    const from = {
      x: draggedBox.x + draggedBox.w / 2,
      y: draggedBox.y + draggedBox.h / 2,
    };
    const to = {
      x: fixedBefore.x + fixedBefore.w / 2,
      y: fixedBefore.y + fixedBefore.h / 2,
    };
    await frigateApp.page.mouse.move(from.x, from.y);
    await frigateApp.page.mouse.down();
    await frigateApp.page.mouse.move(to.x, to.y, { steps: 15 });
    await frigateApp.page.mouse.up();

    const { front_door: fixedAfter } = await cameraBoxes(
      frigateApp.page,
      cameras,
      "card",
    );
    // Allow a few px of snap; a collision-push would move it a whole tile down.
    expect(Math.abs(fixedAfter.y - fixedBefore.y)).toBeLessThan(40);
  });

  test("resizing a top-row tile preserves its aspect ratio (no pillarboxing)", async ({
    frigateApp,
  }) => {
    // A lone top tile has room to grow sideways, which is what exposed the bug:
    // a top-edge handle let width grow while height stayed clamped at y=0.
    await frigateApp.installDefaults({
      config: { camera_groups: { outdoor: { cameras: ["front_door"] } } },
    });
    await frigateApp.goto(`/?group=${GROUP}`);
    const live = new LivePage(frigateApp.page, true);
    await expect(live.cameraCard("front_door").first()).toBeVisible({
      timeout: 10_000,
    });
    await live.editLayoutButton.click();

    const tile = frigateApp.page.locator(".react-grid-item", {
      has: frigateApp.page.locator("[data-camera='front_door']"),
    });
    const only = ["front_door"] as const;
    const { front_door: before } = await cameraBoxes(
      frigateApp.page,
      only,
      "card",
    );
    const aspect = before.w / before.h;

    // Regression: if a top-edge handle is exposed, dragging it up/out must NOT
    // distort the aspect (the old bug grew width while height stayed clamped).
    const ne = tile.locator(".react-resizable-handle-ne");
    if (await ne.count()) {
      await ne.dragTo(tile, {
        force: true,
        targetPosition: { x: 1000, y: -160 },
      });
      const { front_door: afterNe } = await cameraBoxes(
        frigateApp.page,
        only,
        "card",
      );
      // It must actually resize (not a silent no-op) AND keep its aspect.
      expect(afterNe.w).toBeGreaterThan(before.w);
      expect(Math.abs(afterNe.w / afterNe.h - aspect)).toBeLessThan(0.2);
    }

    // Positive: growing from the bottom-right corner resizes and keeps aspect.
    const se = tile.locator(".react-resizable-handle-se");
    await se.dragTo(tile, { force: true, targetPosition: { x: 1000, y: 520 } });
    const { front_door: grown } = await cameraBoxes(
      frigateApp.page,
      only,
      "card",
    );
    expect(grown.w).toBeGreaterThan(before.w);
    expect(Math.abs(grown.w / grown.h - aspect)).toBeLessThan(0.2);
  });

  test("the grid keeps its measured width after a back navigation", async ({
    frigateApp,
  }) => {
    // The grid sizes itself from window.innerWidth until its container is
    // measured. On a warm back navigation nothing re-renders after that
    // container mounts, so an observer that never attaches leaves every tile
    // sized against the full window: the layout widens by the sidebar's width
    // and the rightmost column clips on a full row.
    await frigateApp.goto(`/?group=${GROUP}`);
    const live = new LivePage(frigateApp.page, true);
    await expect(live.cameraCard("front_door").first()).toBeVisible({
      timeout: 10_000,
    });

    // total width the tiles span; tracks the width the grid laid out against
    const span = () =>
      frigateApp.page.evaluate(() => {
        const tiles = [...document.querySelectorAll(".react-grid-item")];

        if (!tiles.length) {
          return null;
        }

        const rects = tiles.map((tile) => tile.getBoundingClientRect());
        return +(
          Math.max(...rects.map((r) => r.right)) -
          Math.min(...rects.map((r) => r.left))
        ).toFixed(1);
      });

    let fresh: number | null = null;
    await expect
      .poll(async () => (fresh = await span()), { timeout: 10_000 })
      .not.toBeNull();

    await live.cameraCard("front_door").first().click();
    await expect(frigateApp.page).toHaveURL(/#front_door/);

    await frigateApp.page.goBack();
    await expect(live.cameraCard("front_door").first()).toBeVisible({
      timeout: 10_000,
    });

    // the layout must settle back to the measured width, not window.innerWidth
    await expect
      .poll(span, { timeout: 10_000 })
      .toBeLessThanOrEqual(fresh! + 2);
  });

  test("saved layout from an unreadable version regenerates without error", async ({
    frigateApp,
  }) => {
    await frigateApp.goto(`/?group=${GROUP}`);
    const live = new LivePage(frigateApp.page, true);
    await expect(live.cameraCard("front_door").first()).toBeVisible({
      timeout: 10_000,
    });

    // A bare array is converted rather than discarded (covered in
    // live-grid-aspect-modes), so use a version the current grid cannot read.
    const key = await persistedLayoutKey(frigateApp.page, GROUP);
    await seedLayout(frigateApp.page, key, {
      version: 1,
      naturalAspect: false,
      layout: [{ i: "front_door", x: 0, y: 0, w: 4, h: 3 }],
    });

    await frigateApp.page.reload();
    await frigateApp.page.waitForSelector("#pageRoot", { timeout: 10_000 });

    // Grid regenerated; both cameras still render and the error collector
    // (frigate-test fixture) catches any crash.
    await expect(live.cameraCard("front_door").first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(live.cameraCard("backyard").first()).toBeVisible();

    // The app must have replaced the value it could not read. Without this the
    // test would still pass against a key the app never touches.
    await expect
      .poll(async () => (await readLayout(frigateApp.page, key))?.version, {
        timeout: 10_000,
      })
      .toBeGreaterThan(1);
  });
});

test.describe("Masonry live grid on mobile @critical @mobile", () => {
  test("custom group keeps the static grid, with no draggable layout", async ({
    frigateApp,
  }) => {
    test.skip(!frigateApp.isMobile, "Mobile-only");

    await frigateApp.goto(`/?group=${GROUP}`);
    const live = new LivePage(frigateApp.page, false);
    await expect(live.cameraCard("front_door").first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(live.cameraCard("backyard").first()).toBeVisible();

    // isMobileOnly routes around DraggableGridLayout entirely, so neither the
    // grid items nor the edit-layout toggle may appear.
    await expect(frigateApp.page.locator(".react-grid-item")).toHaveCount(0);
    await expect(live.editLayoutButton).toHaveCount(0);
  });
});
