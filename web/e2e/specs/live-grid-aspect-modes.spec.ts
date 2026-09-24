/**
 * Live grid aspect modes.
 *
 * Bucketed mode (the default) snaps every camera to a wide, landscape or tall
 * tile, and converts layouts saved by pre-masonry versions instead of
 * discarding them. Natural mode sizes each tile to its own camera.
 */

import { test, expect } from "../fixtures/frigate-test";
import { LivePage } from "../pages/live.page";
import {
  cameraBoxes,
  persistedLayoutKey,
  readLayout,
  seedLayout,
  type LayoutItem,
} from "../helpers/grid-layout";

const GROUP = "outdoor";
const GRID_COLS = 96;

test.describe("Live grid aspect modes @critical", () => {
  test.skip(
    ({ frigateApp }) => frigateApp.isMobile,
    "Draggable grid is desktop-only",
  );

  test("an ultra-wide camera gets a 32:9 tile in bucketed mode @mobile", async ({
    frigateApp,
  }) => {
    await frigateApp.installDefaults({
      config: {
        cameras: { backyard: { detect: { width: 2560, height: 720 } } },
      },
    });
    await frigateApp.goto(`/?group=${GROUP}`);
    const live = new LivePage(frigateApp.page, true);
    await expect(live.cameraCard("backyard").first()).toBeVisible({
      timeout: 10_000,
    });

    const { backyard: wide, front_door: normal } = await cameraBoxes(
      frigateApp.page,
      ["backyard", "front_door"] as const,
    );

    expect(wide.w / wide.h).toBeCloseTo(32 / 9, 1);
    expect(wide.w / normal.w).toBeCloseTo(2, 1);
    expect(wide.h).toBeCloseTo(normal.h, 0);
  });

  test("a letterboxed still image rounds its own corners", async ({
    frigateApp,
  }) => {
    // A portrait camera pillarboxes inside its 8:9 bucket, so the card's
    // overflow-hidden clip never reaches the picture's corners. The image has
    // to carry the radius itself or it renders with square edges on the tile.
    await frigateApp.installDefaults({
      config: {
        cameras: { backyard: { detect: { width: 720, height: 1280 } } },
      },
    });
    await frigateApp.goto(`/?group=${GROUP}`);
    const live = new LivePage(frigateApp.page, true);
    await expect(live.cameraCard("backyard").first()).toBeVisible({
      timeout: 10_000,
    });

    const radii = await frigateApp.page.evaluate(() => {
      const card = document.querySelector("[data-camera='backyard']");
      const img = card?.querySelector("img");
      return {
        card: card ? getComputedStyle(card).borderTopLeftRadius : null,
        img: img ? getComputedStyle(img).borderTopLeftRadius : null,
      };
    });

    expect(radii.card).not.toBe("0px");
    expect(radii.img).toBe(radii.card);
  });

  test("a pre-masonry layout is converted, keeping resized tiles", async ({
    frigateApp,
  }) => {
    await frigateApp.goto(`/?group=${GROUP}`);
    const live = new LivePage(frigateApp.page, true);
    await expect(live.cameraCard("front_door").first()).toBeVisible({
      timeout: 10_000,
    });

    // 0.17/0.18 shape: bare array on a 12-column grid, 4x4 standard tiles.
    // backyard was manually resized to 8x8 and sits beside front_door's column,
    // front_door is a standard tile on the row below.
    const key = await persistedLayoutKey(frigateApp.page, GROUP);
    await seedLayout(frigateApp.page, key, [
      { i: "backyard", x: 4, y: 0, w: 8, h: 8, moved: false, static: false },
      { i: "front_door", x: 0, y: 8, w: 4, h: 4, moved: false, static: false },
    ]);
    await frigateApp.page.reload();
    await frigateApp.page.waitForSelector("#pageRoot", { timeout: 10_000 });
    await expect(live.cameraCard("front_door").first()).toBeVisible({
      timeout: 10_000,
    });

    // The conversion is written back on first load, replacing the legacy array
    // with an envelope. Poll for it: that write is an async idb put.
    await expect
      .poll(async () => (await readLayout(frigateApp.page, key))?.version, {
        timeout: 10_000,
      })
      .toBe(2);

    const stored = (await readLayout(frigateApp.page, key))!;
    expect(stored).toMatchObject({ version: 2, naturalAspect: false });

    // x and w scale 8x (12 -> 96 columns), y and h scale 18x (4 -> 72 rows per
    // standard tile), so the manual resize survives instead of snapping back.
    expect(
      stored.layout.find((i: LayoutItem) => i.i === "backyard"),
    ).toMatchObject({
      x: 32,
      y: 0,
      w: 64,
      h: 144,
    });
    expect(
      stored.layout.find((i: LayoutItem) => i.i === "front_door"),
    ).toMatchObject({
      x: 0,
      y: 144,
      w: 32,
      h: 72,
    });

    // arrangement on screen: backyard indented, front_door below it
    const { backyard, front_door: frontDoor } = await cameraBoxes(
      frigateApp.page,
      ["backyard", "front_door"] as const,
    );
    expect(backyard.x).toBeGreaterThan(frontDoor.x + frontDoor.w / 2);
    expect(frontDoor.y).toBeGreaterThan(backyard.y + backyard.h / 2);
  });

  test("conversion is a pure scale, so odd sizes and positions survive", async ({
    frigateApp,
  }) => {
    await frigateApp.goto(`/?group=${GROUP}`);
    const live = new LivePage(frigateApp.page, true);
    await expect(live.cameraCard("front_door").first()).toBeVisible({
      timeout: 10_000,
    });

    // The old grid exposed all four resize corners with no aspect constraint,
    // so a stored tile can be any size. These two are adjacent and non-standard.
    const key = await persistedLayoutKey(frigateApp.page, GROUP);
    await seedLayout(frigateApp.page, key, [
      { i: "front_door", x: 0, y: 3, w: 5, h: 5 },
      { i: "backyard", x: 5, y: 3, w: 7, h: 5 },
    ]);
    await frigateApp.page.reload();
    await frigateApp.page.waitForSelector("#pageRoot", { timeout: 10_000 });
    await expect(live.cameraCard("backyard").first()).toBeVisible({
      timeout: 10_000,
    });

    await expect
      .poll(async () => (await readLayout(frigateApp.page, key))?.version, {
        timeout: 10_000,
      })
      .toBe(2);

    const stored = (await readLayout(frigateApp.page, key))!;
    const frontDoor = stored.layout.find(
      (i: LayoutItem) => i.i === "front_door",
    )!;
    const backyard = stored.layout.find((i: LayoutItem) => i.i === "backyard")!;

    expect(frontDoor).toMatchObject({ x: 0, y: 54, w: 40, h: 90 });
    expect(backyard).toMatchObject({ x: 40, y: 54, w: 56, h: 90 });

    // still adjacent, still inside the grid, still not overlapping
    expect(frontDoor.x + frontDoor.w).toBe(backyard.x);
    expect(backyard.x + backyard.w).toBe(GRID_COLS);
  });
});
