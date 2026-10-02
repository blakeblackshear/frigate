import get from "lodash/get";
import setWith from "lodash/setWith";
import { CameraConfig } from "@/types/frigateConfig";

// Camera sections whose required_zones lists name zones
const REQUIRED_ZONES_SECTIONS = [
  "review.alerts",
  "review.detections",
  "objects.genai",
  "snapshots",
  "mqtt",
  "onvif.autotracking",
];

// The subset a profile can override
const PROFILE_REQUIRED_ZONES_SECTIONS = [
  "review.alerts",
  "review.detections",
  "objects.genai",
  "snapshots",
];

/**
 * Build the camera-level config_data that follows a zone rename or delete.
 *
 * With newName, every required_zones list and profile zone override moves to
 * the new name. Without it, they drop the zone. Lists are written whole, so a
 * list the camera inherits from the global config gets a camera-level copy.
 * An empty result means nothing else names the zone.
 */
export const zoneReferenceUpdates = (
  camera: CameraConfig,
  name: string,
  newName?: string,
): Record<string, unknown> => {
  const updates: Record<string, unknown> = {};

  // Object paths keep a numeric profile name from becoming an array index
  const put = (path: string[], value: unknown) =>
    setWith(updates, path, value, Object);

  const moveInLists = (
    source: unknown,
    prefix: string[],
    sections: string[],
  ) => {
    for (const section of sections) {
      const path = section.split(".");
      const zones: string[] | undefined = get(source, [
        ...path,
        "required_zones",
      ]);

      if (!zones?.includes(name)) {
        continue;
      }

      const renamed = zones.flatMap((zone) =>
        zone !== name ? [zone] : newName ? [newName] : [],
      );
      put([...prefix, ...path, "required_zones"], [...new Set(renamed)]);
    }
  };

  // An active profile merges into the top-level sections, so read the base
  moveInLists(
    { ...camera, ...camera.base_config },
    [],
    REQUIRED_ZONES_SECTIONS,
  );

  for (const [profile, override] of Object.entries(camera.profiles ?? {})) {
    moveInLists(
      override,
      ["profiles", profile],
      PROFILE_REQUIRED_ZONES_SECTIONS,
    );

    const zone = override?.zones?.[name];

    if (zone === undefined) {
      continue;
    }

    put(["profiles", profile, "zones", name], null);

    if (newName) {
      put(["profiles", profile, "zones", newName], zone);
    }
  }

  return updates;
};
