/**
 * The Settings page section index.
 *
 * This is the single source for which sections exist, what order they appear
 * in, and which group each one belongs to. It lives outside
 * `pages/Settings.tsx` so that callers which only need to link to a section
 * (the command menu) do not pull every settings view into their bundle.
 * `pages/Settings.tsx` maps these keys onto the components that render them.
 */

export const settingsViewGroups = [
  {
    label: "general",
    views: ["uiSettings"],
  },
  {
    label: "globalConfig",
    views: [
      "profiles",
      "cameraManagement",
      "globalDetect",
      "globalObjects",
      "globalMotion",
      "globalFfmpeg",
      "globalRecording",
      "globalSnapshots",
      "globalReview",
      "globalAudioEvents",
      "globalLivePlayback",
      "globalTimestampStyle",
    ],
  },
  {
    label: "cameras",
    views: [
      "cameraDetect",
      "cameraObjects",
      "cameraMotion",
      "motionTuner",
      "cameraFfmpeg",
      "cameraRecording",
      "cameraSnapshots",
      "masksAndZones",
      "cameraReview",
      "cameraAudioEvents",
      "cameraAudioTranscription",
      "cameraBirdseye",
      "cameraLivePlayback",
      "cameraNotifications",
      "cameraFaceRecognition",
      "cameraLpr",
      "cameraOnvif",
      "cameraMqttConfig",
      "cameraTimestampStyle",
    ],
  },
  {
    label: "enrichments",
    views: [
      "integrationSemanticSearch",
      "integrationGenerativeAi",
      "integrationFaceRecognition",
      "integrationLpr",
      "integrationObjectClassification",
      "triggers",
      "integrationAudioTranscription",
    ],
  },
  {
    label: "system",
    views: [
      "systemGo2rtcStreams",
      "systemDetectorsAndModel",
      "systemDatabase",
      "systemMqtt",
      "systemBirdseye",
      "systemTls",
      "systemAuthentication",
      "systemNetworking",
      "systemProxy",
      "systemUi",
      "systemLogging",
      "systemEnvironmentVariables",
      "systemTelemetry",
    ],
  },
  {
    label: "users",
    views: ["users", "roles"],
  },
  {
    label: "notifications",
    views: ["notifications"],
  },
  {
    label: "frigateplus",
    views: ["frigateplus"],
  },
  {
    label: "maintenance",
    views: ["mediaSync", "regionGrid"],
  },
] as const;

/** `enrichments` and `debug` are reachable in the UI but have no menu entry. */
export type SettingsType =
  | (typeof settingsViewGroups)[number]["views"][number]
  | "enrichments"
  | "debug";

export const allSettingsViews: SettingsType[] = [
  ...settingsViewGroups.flatMap((group) => group.views),
  "enrichments",
  "debug",
];

/** Sections a viewer may open. Everything else is admin only. */
export const ALLOWED_VIEWS_FOR_VIEWER: SettingsType[] = [
  "uiSettings",
  "notifications",
];
