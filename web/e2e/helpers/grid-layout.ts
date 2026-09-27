/**
 * Helpers for the live dashboard's draggable grid layout: reading and seeding
 * the persisted layout, and measuring rendered tiles.
 *
 * DraggableGridLayout persists through useUserPersistence, which namespaces
 * keys by username, and every write is an async idb put. A test that seeds the
 * bare key, or seeds before the app's own first write has landed, silently
 * asserts against a key the app never reads. persistedLayoutKey() closes both
 * holes, so prefer it over building the key by hand.
 *
 * Geometry has its own trap: the grid first lays out against window.innerWidth,
 * then reflows narrower once useResizeObserver reports the real container.
 * Tiles measured in separate round-trips can straddle that reflow and disagree
 * on scale, so cameraBoxes() takes every measurement in one evaluate.
 *
 * Used by live-grid-aspect-modes.spec.ts and masonry-live-grid.spec.ts.
 */

import { expect, type Page } from "@playwright/test";

export type LayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PersistedLayout = {
  version: number;
  naturalAspect: boolean;
  layout: LayoutItem[];
};

function layoutKeySuffix(group: string): string {
  return `${group}-draggable-layout`;
}

/**
 * The key the app has actually written an envelope to, or undefined while its
 * first write is still in flight.
 */
function findWrittenKey(
  page: Page,
  group: string,
): Promise<string | undefined> {
  return page.evaluate(
    (suffix) =>
      new Promise<string | undefined>((resolve) => {
        const open = indexedDB.open("keyval-store");
        open.onsuccess = () => {
          const store = open.result
            .transaction("keyval", "readonly")
            .objectStore("keyval");
          // getAllKeys and getAll both return in key order, so the indexes align
          const keys = store.getAllKeys();
          const values = store.getAll();
          keys.transaction.oncomplete = () => {
            open.result.close();
            const names = keys.result as string[];
            const stored = values.result as { version?: number }[];
            const match = names.findIndex(
              (name, index) =>
                (name === suffix || name.startsWith(`${suffix}:`)) &&
                typeof stored[index]?.version === "number",
            );
            resolve(match === -1 ? undefined : names[match]);
          };
        };
        open.onerror = () => resolve(undefined);
      }),
    layoutKeySuffix(group),
  );
}

/**
 * Wait for the grid to persist its own layout, then return the key it used.
 * Waiting for that write is what makes a later seed meaningful: it proves the
 * key is live, and it rules out the app overwriting the seed a moment later.
 */
export async function persistedLayoutKey(
  page: Page,
  group: string,
): Promise<string> {
  let key: string | undefined;

  await expect
    .poll(async () => (key = await findWrittenKey(page, group)), {
      timeout: 10_000,
      message: `grid never persisted a layout for group "${group}"`,
    })
    .not.toBeUndefined();

  return key!;
}

/** Overwrite the stored layout, resolving only once the put has committed. */
export function seedLayout(
  page: Page,
  key: string,
  value: unknown,
): Promise<void> {
  return page.evaluate(
    ([key, value]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("keyval-store");
        open.onupgradeneeded = () => open.result.createObjectStore("keyval");
        open.onsuccess = () => {
          const tx = open.result.transaction("keyval", "readwrite");
          tx.objectStore("keyval").put(value, key as string);
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        open.onerror = () => reject(open.error);
      }),
    [key, value] as const,
  );
}

/** Read the stored layout back. Undefined until the app writes it. */
export function readLayout(
  page: Page,
  key: string,
): Promise<PersistedLayout | undefined> {
  return page.evaluate(
    (target) =>
      new Promise((resolve) => {
        const open = indexedDB.open("keyval-store");
        open.onsuccess = () => {
          const tx = open.result.transaction("keyval", "readonly");
          const request = tx.objectStore("keyval").get(target);
          tx.oncomplete = () => {
            open.result.close();
            resolve(request.result);
          };
        };
        open.onerror = () => resolve(undefined);
      }),
    key,
  ) as Promise<PersistedLayout | undefined>;
}

export type Box = { w: number; h: number; x: number; y: number };

/** The card is the player root; the cell is the grid slot it sits in. */
export type BoxTarget = "card" | "cell";

/** One atomic snapshot, or null while any tile is missing or unlaid out. */
function snapshotBoxes(
  page: Page,
  cameras: readonly string[],
  target: BoxTarget,
): Promise<Record<string, Box> | null> {
  return page.evaluate(
    ({ cams, target }) => {
      const boxes: Record<string, Box> = {};

      for (const cam of cams) {
        const card = document.querySelector(`[data-camera='${cam}']`);
        const el = target === "cell" ? card?.closest(".p-1") : card;

        if (!el) {
          return null;
        }

        const r = el.getBoundingClientRect();

        // a re-rendering tile can briefly report no box at all
        if (!r.width || !r.height) {
          return null;
        }

        boxes[cam] = { w: r.width, h: r.height, x: r.x, y: r.y };
      }

      return boxes;
    },
    { cams: cameras as readonly string[], target },
  );
}

/**
 * Measure the given cameras' tiles together, once they have all rendered.
 * Measuring in one evaluate is what keeps the numbers mutually comparable.
 */
export async function cameraBoxes<T extends string>(
  page: Page,
  cameras: readonly T[],
  target: BoxTarget = "cell",
): Promise<Record<T, Box>> {
  let boxes: Record<string, Box> | null = null;

  await expect
    .poll(async () => (boxes = await snapshotBoxes(page, cameras, target)), {
      timeout: 10_000,
      message: `${target}s never rendered for ${cameras.join(", ")}`,
    })
    .not.toBeNull();

  return boxes as unknown as Record<T, Box>;
}
