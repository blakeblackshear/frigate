/**
 * FrigateConfig factory for E2E tests.
 *
 * Uses a real config snapshot generated from the Python backend's FrigateConfig
 * model. This guarantees all fields are present and match what the app expects.
 * Tests override specific fields via DeepPartial.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configSnapshot = JSON.parse(
  readFileSync(resolve(__dirname, "config-snapshot.json"), "utf-8"),
);

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  overrides?: DeepPartial<T>,
): T {
  if (!overrides) return base;
  const result = { ...base };
  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const val = overrides[key];
    if (
      val !== undefined &&
      typeof val === "object" &&
      val !== null &&
      !Array.isArray(val) &&
      typeof base[key] === "object" &&
      base[key] !== null &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(
        base[key] as Record<string, unknown>,
        val as DeepPartial<Record<string, unknown>>,
      ) as T[keyof T];
    } else if (val !== undefined) {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}

// The base config is a real snapshot from the Python backend.
// Apply test-specific overrides: friendly names, camera groups, version.
export const BASE_CONFIG = {
  ...configSnapshot,
  version: "0.15.0-test",
  cameras: {
    ...configSnapshot.cameras,
    front_door: {
      ...configSnapshot.cameras.front_door,
      friendly_name: "Front Door",
    },
    backyard: {
      ...configSnapshot.cameras.backyard,
      friendly_name: "Backyard",
    },
    garage: {
      ...configSnapshot.cameras.garage,
      friendly_name: "Garage",
    },
  },
};

export function configFactory(
  overrides?: DeepPartial<typeof BASE_CONFIG>,
): typeof BASE_CONFIG {
  return deepMerge(BASE_CONFIG, overrides);
}
