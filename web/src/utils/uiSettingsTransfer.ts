import { get as getData, set as setData } from "idb-keyval";
import { z } from "zod";
import { getUserNamespacedKey } from "@/hooks/use-user-persistence";

export const UI_SETTINGS_FILE_TYPE = "frigate-ui-settings";
export const UI_SETTINGS_FILE_VERSION = 1;

export type TransferSection = "layouts" | "streaming" | "preferences";

const cameraStreamingSettingsSchema = z.object({
  streamName: z.string(),
  streamType: z.enum(["no-streaming", "smart", "continuous"]),
  compatibilityMode: z.boolean(),
  playAudio: z.boolean(),
  volume: z.number(),
});

const allGroupsStreamingSettingsSchema = z.record(
  z.string(),
  z.record(z.string(), cameraStreamingSettingsSchema),
);

type TransferKey = {
  key: string;
  section: Exclude<TransferSection, "layouts">;
  namespaced: boolean;
  // preference values are validated individually on import: an out-of-range
  // value would otherwise be written and crash the view that reads it
  schema: z.ZodType;
};

// Single source of truth for which browser-stored settings move between
// devices. Layout keys are derived per camera group at export time and so
// are not listed here. `namespaced` mirrors which persistence hook wrote
// the key: useUserPersistence namespaces by username, usePersistence does
// not.
export const TRANSFER_KEYS: TransferKey[] = [
  {
    key: "streaming-settings",
    section: "streaming",
    namespaced: true,
    schema: allGroupsStreamingSettingsSchema,
  },
  {
    key: "autoLiveView",
    section: "preferences",
    namespaced: true,
    schema: z.boolean(),
  },
  {
    key: "displayCameraNames",
    section: "preferences",
    namespaced: true,
    schema: z.boolean(),
  },
  {
    key: "alertVideos",
    section: "preferences",
    namespaced: true,
    schema: z.boolean(),
  },
  {
    key: "liveFallbackTimeout",
    section: "preferences",
    namespaced: true,
    schema: z.number().int().min(1).max(60),
  },
  {
    key: "playbackRate",
    section: "preferences",
    namespaced: true,
    schema: z.number().positive().max(64),
  },
  {
    key: "weekStartsOn",
    section: "preferences",
    namespaced: true,
    schema: z.union([z.literal(0), z.literal(1)]),
  },
  {
    key: "showReviewed",
    section: "preferences",
    namespaced: true,
    schema: z.boolean(),
  },
  {
    key: "exploreGridColumns",
    section: "preferences",
    namespaced: true,
    schema: z.number().int().min(1).max(12),
  },
  {
    key: "exploreDefaultView",
    section: "preferences",
    namespaced: true,
    schema: z.enum(["summary", "grid"]),
  },
  {
    key: "detailStreamActiveExpanded",
    section: "preferences",
    namespaced: true,
    schema: z.boolean(),
  },
  {
    key: "hlsPlayerMuted",
    section: "preferences",
    namespaced: true,
    schema: z.boolean(),
  },
  {
    key: "recordingQuality",
    section: "preferences",
    namespaced: false,
    schema: z.enum(["auto", "main", "sub"]),
  },
  {
    key: "chat-show-stats",
    section: "preferences",
    namespaced: false,
    schema: z.enum(["while_generating", "always"]),
  },
  {
    key: "chat-auto-scroll",
    section: "preferences",
    namespaced: false,
    schema: z.boolean(),
  },
  {
    key: "chat-thinking-enabled",
    section: "preferences",
    namespaced: false,
    schema: z.boolean(),
  },
];

export function layoutKeyForGroup(group: string): string {
  return `${group}-draggable-layout`;
}

function storageKey(
  entry: { key: string; namespaced: boolean },
  username: string | undefined,
): string {
  return entry.namespaced
    ? getUserNamespacedKey(entry.key, username)
    : entry.key;
}

// useUserPersistence migrates legacy un-namespaced keys lazily, on first
// mount of the hook that owns each key, so a value from a view the user
// has not opened since upgrading still lives under the bare key.
async function readTransferable(
  key: string,
  namespaced: boolean,
  username: string | undefined,
) {
  if (!namespaced) {
    return getData(key);
  }

  const namespacedKey = getUserNamespacedKey(key, username);
  const value = await getData(namespacedKey);

  if (value !== undefined || namespacedKey === key) {
    return value;
  }

  return getData(key);
}

// Layout items carry optional react-grid-layout fields (minW, static,
// moved, and others) that vary by version, so unknown keys pass through
// rather than failing validation.
const layoutItemSchema = z
  .object({
    i: z.string(),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  })
  .passthrough();

export const uiSettingsFileSchema = z.object({
  type: z.literal(UI_SETTINGS_FILE_TYPE),
  version: z.number().int().positive(),
  exported_at: z.string(),
  frigate_version: z.string(),
  sections: z.object({
    layouts: z.record(z.string(), z.array(layoutItemSchema)),
    streaming: allGroupsStreamingSettingsSchema,
    preferences: z.record(z.string(), z.unknown()),
  }),
});

export type UiSettingsFile = z.infer<typeof uiSettingsFileSchema>;

export async function buildExportPayload(
  groupNames: string[],
  frigateVersion: string,
  username: string | undefined,
): Promise<UiSettingsFile> {
  const layouts: UiSettingsFile["sections"]["layouts"] = {};
  let streaming: UiSettingsFile["sections"]["streaming"] = {};
  const preferences: UiSettingsFile["sections"]["preferences"] = {};

  await Promise.all(
    groupNames.map(async (group) => {
      const value = await readTransferable(
        layoutKeyForGroup(group),
        true,
        username,
      );

      if (value !== undefined) {
        layouts[group] = value;
      }
    }),
  );

  await Promise.all(
    TRANSFER_KEYS.map(async (entry) => {
      const value = await readTransferable(
        entry.key,
        entry.namespaced,
        username,
      );

      if (value === undefined) {
        return;
      }

      if (entry.section === "streaming") {
        // this key holds the entire group -> camera map, so its value is
        // the section payload rather than one entry within it
        streaming = value;
        return;
      }

      preferences[entry.key] = value;
    }),
  );

  return {
    type: UI_SETTINGS_FILE_TYPE,
    version: UI_SETTINGS_FILE_VERSION,
    exported_at: new Date().toISOString(),
    frigate_version: frigateVersion,
    sections: { layouts, streaming, preferences },
  };
}

export function exportFileName(now: Date): string {
  // local date rather than toISOString: a user west of UTC exporting in
  // the evening would otherwise get tomorrow's date in the filename
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");

  return `frigate-ui-settings-${now.getFullYear()}-${month}-${day}.json`;
}

export function downloadJson(payload: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const element = document.createElement("a");

  element.href = url;
  element.download = fileName;
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(url);
}

export type ParseError =
  | "invalid_json"
  | "wrong_type"
  | "unsupported_version"
  | "invalid_schema";

export type ParseResult =
  | { ok: true; file: UiSettingsFile }
  | { ok: false; error: ParseError };

export function parseUiSettingsFile(text: string): ParseResult {
  let raw: unknown;

  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid_json" };
  }

  if (
    typeof raw !== "object" ||
    raw === null ||
    (raw as { type?: unknown }).type !== UI_SETTINGS_FILE_TYPE
  ) {
    return { ok: false, error: "wrong_type" };
  }

  const version = (raw as { version?: unknown }).version;

  if (typeof version === "number" && version > UI_SETTINGS_FILE_VERSION) {
    return { ok: false, error: "unsupported_version" };
  }

  const parsed = uiSettingsFileSchema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false, error: "invalid_schema" };
  }

  return { ok: true, file: parsed.data };
}

export type ImportSummary = {
  layoutGroupCount: number;
  streamingCameraCount: number;
  preferenceCount: number;
  // unknown groups are split by the section that named them so the dialog
  // can warn only about sections the user is actually importing
  unknownLayoutGroups: string[];
  unknownStreamingGroups: string[];
  unknownCameras: string[];
};

// the only place preference entries are accepted: the import counts and the
// writes must agree, or the dialog reports settings it will not apply
function validPreferenceEntries(
  preferences: UiSettingsFile["sections"]["preferences"],
): { entry: TransferKey; value: unknown }[] {
  const accepted: { entry: TransferKey; value: unknown }[] = [];

  TRANSFER_KEYS.forEach((entry) => {
    if (entry.section !== "preferences") {
      return;
    }

    // hasOwnProperty rather than `in`, which walks the prototype chain
    if (!Object.prototype.hasOwnProperty.call(preferences, entry.key)) {
      return;
    }

    const parsed = entry.schema.safeParse(preferences[entry.key]);

    if (parsed.success) {
      accepted.push({ entry, value: parsed.data });
    }
  });

  return accepted;
}

export function summarizeImport(
  file: UiSettingsFile,
  knownGroups: string[],
  knownCameras: string[],
): ImportSummary {
  const layoutGroups = Object.keys(file.sections.layouts);
  const streamingGroups = Object.keys(file.sections.streaming);
  const streamingCameras = new Set<string>();

  Object.values(file.sections.streaming).forEach((group) =>
    Object.keys(group).forEach((camera) => streamingCameras.add(camera)),
  );

  const knownGroupSet = new Set(knownGroups);
  const knownCameraSet = new Set(knownCameras);

  return {
    layoutGroupCount: layoutGroups.length,
    streamingCameraCount: streamingCameras.size,
    preferenceCount: validPreferenceEntries(file.sections.preferences).length,
    unknownLayoutGroups: layoutGroups
      .filter((group) => !knownGroupSet.has(group))
      .sort(),
    unknownStreamingGroups: streamingGroups
      .filter((group) => !knownGroupSet.has(group))
      .sort(),
    unknownCameras: Array.from(streamingCameras)
      .filter((camera) => !knownCameraSet.has(camera))
      .sort(),
  };
}

export function hasImportableContent(summary: ImportSummary): boolean {
  return (
    summary.layoutGroupCount > 0 ||
    summary.streamingCameraCount > 0 ||
    summary.preferenceCount > 0
  );
}

export async function applyImportPayload(
  file: UiSettingsFile,
  sections: Record<TransferSection, boolean>,
  username: string | undefined,
): Promise<void> {
  const writes: Promise<void>[] = [];

  if (sections.layouts) {
    Object.entries(file.sections.layouts).forEach(([group, layout]) => {
      writes.push(
        setData(
          getUserNamespacedKey(layoutKeyForGroup(group), username),
          layout,
        ),
      );
    });
  }

  const streamingEntry = TRANSFER_KEYS.find(
    (entry) => entry.section === "streaming",
  );

  if (
    sections.streaming &&
    streamingEntry &&
    Object.keys(file.sections.streaming).length > 0
  ) {
    writes.push(
      (async () => {
        // one key holds every group, so merge per group rather than
        // replacing: groups configured only on this device must survive
        const existing =
          (await readTransferable(
            streamingEntry.key,
            streamingEntry.namespaced,
            username,
          )) ?? {};

        await setData(storageKey(streamingEntry, username), {
          ...existing,
          ...file.sections.streaming,
        });
      })(),
    );
  }

  if (sections.preferences) {
    validPreferenceEntries(file.sections.preferences).forEach(
      ({ entry, value }) => {
        writes.push(setData(storageKey(entry, username), value));
      },
    );
  }

  await Promise.all(writes);
}
