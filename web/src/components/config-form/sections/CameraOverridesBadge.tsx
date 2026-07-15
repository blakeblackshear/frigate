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
import { useCameraFriendlyName } from "@/hooks/use-camera-friendly-name";
import { formatList } from "@/utils/stringUtil";
import {
  buildHiddenFieldContext,
  getEffectiveHiddenFields,
  pathMatchesHiddenPattern,
} from "@/utils/configUtil";
import { useOverrideFieldLabel } from "./useOverrideFieldLabel";

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
 * Sections where the cross-camera override badge should be suppressed.
 * Includes enrichment sections that aren't meaningfully per-camera
 * (face recognition and LPR are intentionally omitted so the badge does show
 * there) and every System sub-page (detector hardware, database, networking,
 * etc.) which configures Frigate as a whole, not per-camera state.
 */
const SECTIONS_WITHOUT_OVERRIDE_BADGE = new Set([
  // Enrichments (face_recognition and lpr remain enabled)
  "semantic_search",
  "genai",
  "classification",
  "audio_transcription",
  // System
  "go2rtc_streams",
  "database",
  "mqtt",
  "tls",
  "auth",
  "networking",
  "proxy",
  "ui",
  "logger",
  "environment_vars",
  "telemetry",
  "birdseye",
  "detectors",
  "model",
]);

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
  const { t } = useTranslation(["views/settings"]);
  const fieldLabel = useOverrideFieldLabel(sectionPath);
  const friendlyName = useCameraFriendlyName(entry.camera);
  const { data: profilesData } = useSWR<ProfilesApiResponse>("profiles");

  const profileFriendlyNames = useMemo(() => {
    const map = new Map<string, string>();
    profilesData?.profiles?.forEach((p) => map.set(p.name, p.friendly_name));
    return map;
  }, [profilesData]);

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
    const hiddenFields = getEffectiveHiddenFields(
      sectionPath,
      "global",
      buildHiddenFieldContext(config, "global"),
    );
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
  }, [rawEntries, sectionPath, config]);

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
