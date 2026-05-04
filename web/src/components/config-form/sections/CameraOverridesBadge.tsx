import useSWR from "swr";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LuChevronDown } from "react-icons/lu";

import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CameraOverrideEntry,
  FieldDelta,
  useCamerasOverridingSection,
} from "@/hooks/use-config-override";
import type { FrigateConfig } from "@/types/frigateConfig";
import type { ProfilesApiResponse } from "@/types/profile";
import { humanizeKey } from "@/components/config-form/theme/utils/i18n";
import { useCameraFriendlyName } from "@/hooks/use-camera-friendly-name";
import { formatList } from "@/utils/stringUtil";
import { getSectionConfig } from "@/utils/configUtil";

const CAMERA_PAGE_BY_SECTION: Record<string, string> = {
  detect: "cameraDetect",
  ffmpeg: "cameraFfmpeg",
  record: "cameraRecording",
  snapshots: "cameraSnapshots",
  motion: "cameraMotion",
  objects: "cameraObjects",
  review: "cameraReview",
  audio: "cameraAudioEvents",
  audio_transcription: "cameraAudioTranscription",
  notifications: "cameraNotifications",
  live: "cameraLivePlayback",
  birdseye: "cameraBirdseye",
  face_recognition: "cameraFaceRecognition",
  lpr: "cameraLpr",
  timestamp_style: "cameraTimestampStyle",
};

const MAX_FIELDS_PER_CAMERA = 5;

/**
 * Enrichment sections where the cross-camera override badge should be
 * suppressed because they're effectively global-only (or per-camera
 * configuration there isn't a useful affordance to surface here).
 * Face recognition and LPR are intentionally omitted so the badge does show
 * on those enrichment pages.
 */
const SECTIONS_WITHOUT_OVERRIDE_BADGE = new Set([
  "semantic_search",
  "genai",
  "classification",
  "audio_transcription",
]);

/**
 * Match a delta path against a hidden-field pattern. Supports literal prefixes
 * (so a hidden field "streams" also hides "streams.foo.bar") and `*` wildcards
 * matching exactly one path segment (e.g. "filters.*.mask").
 */
function pathMatchesHiddenPattern(path: string, pattern: string): boolean {
  if (!pattern) return false;
  if (!pattern.includes("*")) {
    return path === pattern || path.startsWith(`${pattern}.`);
  }
  const patternSegments = pattern.split(".");
  const pathSegments = path.split(".");
  if (pathSegments.length < patternSegments.length) return false;
  for (let i = 0; i < patternSegments.length; i += 1) {
    if (patternSegments[i] === "*") continue;
    if (patternSegments[i] !== pathSegments[i]) return false;
  }
  return true;
}

type CameraEntryProps = {
  sectionPath: string;
  entry: CameraOverrideEntry;
  cameraPage?: string;
};

type SourceGroup = {
  /** undefined → camera-level; string → profile name */
  profileName: string | undefined;
  deltas: FieldDelta[];
};

function groupDeltasBySource(deltas: FieldDelta[]): SourceGroup[] {
  const cameraDeltas: FieldDelta[] = [];
  const byProfile = new Map<string, FieldDelta[]>();
  for (const delta of deltas) {
    if (delta.profileName) {
      const arr = byProfile.get(delta.profileName) ?? [];
      arr.push(delta);
      byProfile.set(delta.profileName, arr);
    } else {
      cameraDeltas.push(delta);
    }
  }
  const groups: SourceGroup[] = [];
  if (cameraDeltas.length > 0) {
    groups.push({ profileName: undefined, deltas: cameraDeltas });
  }
  for (const [profileName, group] of byProfile) {
    groups.push({ profileName, deltas: group });
  }
  return groups;
}

function CameraEntry({ sectionPath, entry, cameraPage }: CameraEntryProps) {
  const { t, i18n } = useTranslation([
    "config/global",
    "views/settings",
    "objects",
  ]);
  const friendlyName = useCameraFriendlyName(entry.camera);
  const { data: profilesData } = useSWR<ProfilesApiResponse>("profiles");

  const profileFriendlyNames = useMemo(() => {
    const map = new Map<string, string>();
    profilesData?.profiles?.forEach((p) => map.set(p.name, p.friendly_name));
    return map;
  }, [profilesData]);

  const fieldLabel = (fieldPath: string) => {
    if (!fieldPath) {
      const sectionKey = `${sectionPath}.label`;
      return i18n.exists(sectionKey, { ns: "config/global" })
        ? t(sectionKey, { ns: "config/global" })
        : humanizeKey(sectionPath);
    }

    const segments = fieldPath.split(".");

    // Most specific: try the full nested path
    const fullKey = `${sectionPath}.${fieldPath}.label`;
    if (i18n.exists(fullKey, { ns: "config/global" })) {
      return t(fullKey, { ns: "config/global" });
    }

    // Try dropping each intermediate segment in turn — those are typically
    // user-defined dict keys (object class names, zone names, etc.) that
    // don't have their own label entries. Prepend the dropped segment as
    // context to disambiguate (e.g. "Person · Minimum object area").
    for (let i = 0; i < segments.length; i++) {
      const reduced = [...segments.slice(0, i), ...segments.slice(i + 1)].join(
        ".",
      );
      if (!reduced) continue;
      const reducedKey = `${sectionPath}.${reduced}.label`;
      if (i18n.exists(reducedKey, { ns: "config/global" })) {
        const resolvedLabel = t(reducedKey, { ns: "config/global" });
        const dropped = segments[i];
        // Object class names ("person", "car", "fox") have translations in
        // the `objects` namespace; fall back to humanizing the raw key for
        // anything that isn't a known label.
        const droppedLabel = i18n.exists(dropped, { ns: "objects" })
          ? t(dropped, { ns: "objects" })
          : humanizeKey(dropped);
        return `${droppedLabel} · ${resolvedLabel}`;
      }
    }

    // Last resort: humanize the leaf segment
    return humanizeKey(segments[segments.length - 1]);
  };

  const formatDeltas = (deltas: FieldDelta[]) => {
    const visibleLabels = deltas
      .slice(0, MAX_FIELDS_PER_CAMERA)
      .map((delta) => fieldLabel(delta.fieldPath));
    const hiddenCount = deltas.length - visibleLabels.length;
    const labelsForList =
      hiddenCount > 0
        ? [
            ...visibleLabels,
            t("button.overriddenInCameras.othersField", {
              ns: "views/settings",
              count: hiddenCount,
            }),
          ]
        : visibleLabels;
    return formatList(labelsForList);
  };

  const groups = groupDeltasBySource(entry.fieldDeltas);

  return (
    <div className="flex flex-col gap-0.5 text-xs">
      {cameraPage ? (
        <Link
          to={`/settings?page=${cameraPage}&camera=${encodeURIComponent(entry.camera)}`}
          className="font-medium hover:underline"
        >
          {friendlyName}
        </Link>
      ) : (
        <span className="font-medium">{friendlyName}</span>
      )}
      {groups.map((group) => (
        <span
          key={group.profileName ?? "__camera__"}
          className="ml-2 text-muted-foreground"
        >
          {group.profileName
            ? t("button.overriddenInCameras.profilePrefix", {
                ns: "views/settings",
                profile:
                  profileFriendlyNames.get(group.profileName) ??
                  group.profileName,
                fields: formatDeltas(group.deltas),
              })
            : formatDeltas(group.deltas)}
        </span>
      ))}
    </div>
  );
}

type Props = {
  sectionPath: string;
  className?: string;
};

export function CameraOverridesBadge({ sectionPath, className }: Props) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { t } = useTranslation(["views/settings"]);
  const rawEntries = useCamerasOverridingSection(config, sectionPath);

  const entries = useMemo(() => {
    const hiddenFields =
      getSectionConfig(sectionPath, "global").hiddenFields ?? [];
    if (hiddenFields.length === 0) return rawEntries;
    return rawEntries
      .map((entry) => ({
        ...entry,
        fieldDeltas: entry.fieldDeltas.filter(
          (delta) =>
            !hiddenFields.some((pattern) =>
              pathMatchesHiddenPattern(delta.fieldPath, pattern),
            ),
        ),
      }))
      .filter((entry) => entry.fieldDeltas.length > 0);
  }, [rawEntries, sectionPath]);

  if (SECTIONS_WITHOUT_OVERRIDE_BADGE.has(sectionPath)) {
    return null;
  }

  if (entries.length === 0) {
    return null;
  }

  const cameraPage = CAMERA_PAGE_BY_SECTION[sectionPath];
  const count = entries.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="secondary"
          className={`cursor-pointer border-2 border-selected text-xs text-primary-variant ${className ?? ""}`}
          aria-label={t("button.overriddenInCameras.tooltip", {
            ns: "views/settings",
            count: count,
          })}
        >
          <span>
            {t("button.overriddenInCameras.label", {
              ns: "views/settings",
              count: count,
            })}
          </span>
          <LuChevronDown className="ml-1 size-3" />
        </Badge>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 max-w-[90vw] pr-0">
        <div className="flex flex-col gap-3">
          <div className="pr-4 text-xs text-primary-variant">
            {t("button.overriddenInCameras.heading", {
              ns: "views/settings",
              count: count,
            })}
          </div>
          <div className="scrollbar-container flex max-h-[40dvh] flex-col gap-2 overflow-y-auto pr-4">
            {entries.map((entry) => (
              <CameraEntry
                key={entry.camera}
                sectionPath={sectionPath}
                entry={entry}
                cameraPage={cameraPage}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
