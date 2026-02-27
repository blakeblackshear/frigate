import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import useOptimisticState from "@/hooks/use-optimistic-state";
import { isMobile } from "react-device-detect";
import { FaVideo } from "react-icons/fa";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import type { ConfigSectionData } from "@/types/configForm";
import useSWR from "swr";
import FilterSwitch from "@/components/filter/FilterSwitch";
import { ZoneMaskFilterButton } from "@/components/filter/ZoneMaskFilter";
import { PolygonType } from "@/types/canvas";
import CameraManagementView from "@/views/settings/CameraManagementView";
import MotionTunerView from "@/views/settings/MotionTunerView";
import MasksAndZonesView from "@/views/settings/MasksAndZonesView";
import UsersView from "@/views/settings/UsersView";
import RolesView from "@/views/settings/RolesView";
import UiSettingsView from "@/views/settings/UiSettingsView";
import FrigatePlusSettingsView from "@/views/settings/FrigatePlusSettingsView";
import MaintenanceSettingsView from "@/views/settings/MaintenanceSettingsView";
import SystemDetectionModelSettingsView from "@/views/settings/SystemDetectionModelSettingsView";
import {
  SingleSectionPage,
  type SettingsPageProps,
  type SectionStatus,
} from "@/views/settings/SingleSectionPage";
import { useSearchEffect } from "@/hooks/use-overlay-state";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useInitialCameraState } from "@/api/ws";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useTranslation } from "react-i18next";
import { useAllCameraOverrides } from "@/hooks/use-config-override";
import TriggerView from "@/views/settings/TriggerView";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import Heading from "@/components/ui/heading";
import { LuChevronRight } from "react-icons/lu";
import Logo from "@/components/Logo";
import {
  MobilePage,
  MobilePageContent,
  MobilePageHeader,
  MobilePageTitle,
} from "@/components/mobile/MobilePage";
import { Toaster } from "@/components/ui/sonner";
import axios from "axios";
import { toast } from "sonner";
import { mutate } from "swr";
import { RJSFSchema } from "@rjsf/utils";
import {
  buildConfigDataForPath,
  prepareSectionSavePayload,
} from "@/utils/configUtil";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import RestartDialog from "@/components/overlay/dialog/RestartDialog";
import SaveAllPreviewPopover, {
  type SaveAllPreviewItem,
} from "@/components/overlay/detail/SaveAllPreviewPopover";
import { useRestart } from "@/api/ws";

const allSettingsViews = [
  "profileSettings",
  "globalDetect",
  "globalRecording",
  "globalSnapshots",
  "globalFfmpeg",
  "globalMotion",
  "globalObjects",
  "globalReview",
  "globalAudioEvents",
  "globalLivePlayback",
  "globalTimestampStyle",
  "systemDatabase",
  "systemTls",
  "systemAuthentication",
  "systemNetworking",
  "systemProxy",
  "systemUi",
  "systemLogging",
  "systemEnvironmentVariables",
  "systemTelemetry",
  "systemBirdseye",
  "systemDetectorHardware",
  "systemDetectionModel",
  "systemMqtt",
  "integrationSemanticSearch",
  "integrationGenerativeAi",
  "integrationFaceRecognition",
  "integrationLpr",
  "integrationObjectClassification",
  "integrationAudioTranscription",
  "cameraDetect",
  "cameraFfmpeg",
  "cameraRecording",
  "cameraSnapshots",
  "cameraMotion",
  "cameraObjects",
  "cameraReview",
  "cameraAudioEvents",
  "cameraAudioTranscription",
  "cameraNotifications",
  "cameraLivePlayback",
  "cameraBirdseye",
  "cameraFaceRecognition",
  "cameraLpr",
  "cameraMqttConfig",
  "cameraOnvif",
  "cameraUi",
  "cameraTimestampStyle",
  "cameraManagement",
  "masksAndZones",
  "motionTuner",
  "enrichments",
  "triggers",
  "debug",
  "users",
  "roles",
  "notifications",
  "frigateplus",
  "maintenance",
] as const;
type SettingsType = (typeof allSettingsViews)[number];

const parsePendingDataKey = (pendingDataKey: string) => {
  if (pendingDataKey.includes("::")) {
    const idx = pendingDataKey.indexOf("::");
    return {
      scope: "camera" as const,
      cameraName: pendingDataKey.slice(0, idx),
      sectionPath: pendingDataKey.slice(idx + 2),
    };
  }

  return {
    scope: "global" as const,
    cameraName: undefined,
    sectionPath: pendingDataKey,
  };
};

const flattenOverrides = (
  value: unknown,
  path: string[] = [],
): Array<{ path: string; value: unknown }> => {
  if (value === undefined) return [];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [{ path: path.join("."), value }];
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return [{ path: path.join("."), value: {} }];
  }

  return entries.flatMap(([key, entryValue]) =>
    flattenOverrides(entryValue, [...path, key]),
  );
};

const createSectionPage = (
  sectionKey: string,
  level: "global" | "camera",
  options?: { showOverrideIndicator?: boolean },
) => {
  return (props: SettingsPageProps) => (
    <SingleSectionPage
      sectionKey={sectionKey}
      level={level}
      showOverrideIndicator={options?.showOverrideIndicator}
      {...props}
    />
  );
};

const GlobalDetectSettingsPage = createSectionPage("detect", "global");
const GlobalRecordingSettingsPage = createSectionPage("record", "global");
const GlobalSnapshotsSettingsPage = createSectionPage("snapshots", "global");
const GlobalFfmpegSettingsPage = createSectionPage("ffmpeg", "global");
const GlobalMotionSettingsPage = createSectionPage("motion", "global");
const GlobalObjectsSettingsPage = createSectionPage("objects", "global");
const GlobalReviewSettingsPage = createSectionPage("review", "global");
const GlobalAudioEventsSettingsPage = createSectionPage("audio", "global");
const GlobalLivePlaybackSettingsPage = createSectionPage("live", "global");
const GlobalTimestampStyleSettingsPage = createSectionPage(
  "timestamp_style",
  "global",
);

const SystemDatabaseSettingsPage = createSectionPage("database", "global");
const SystemTlsSettingsPage = createSectionPage("tls", "global");
const SystemAuthenticationSettingsPage = createSectionPage("auth", "global");
const SystemNetworkingSettingsPage = createSectionPage("networking", "global");
const SystemProxySettingsPage = createSectionPage("proxy", "global");
const SystemUiSettingsPage = createSectionPage("ui", "global");
const SystemLoggingSettingsPage = createSectionPage("logger", "global");
const SystemEnvironmentVariablesSettingsPage = createSectionPage(
  "environment_vars",
  "global",
);
const SystemTelemetrySettingsPage = createSectionPage("telemetry", "global");
const SystemBirdseyeSettingsPage = createSectionPage("birdseye", "global");
const SystemDetectorHardwareSettingsPage = createSectionPage(
  "detectors",
  "global",
);
const SystemDetectionModelSettingsPage = SystemDetectionModelSettingsView;
const NotificationsSettingsPage = createSectionPage("notifications", "global");

const SystemMqttSettingsPage = createSectionPage("mqtt", "global");
const IntegrationSemanticSearchSettingsPage = createSectionPage(
  "semantic_search",
  "global",
);
const IntegrationGenerativeAiSettingsPage = createSectionPage(
  "genai",
  "global",
);
const IntegrationFaceRecognitionSettingsPage = createSectionPage(
  "face_recognition",
  "global",
);
const IntegrationLprSettingsPage = createSectionPage("lpr", "global");
const IntegrationObjectClassificationSettingsPage = createSectionPage(
  "classification",
  "global",
);
const IntegrationAudioTranscriptionSettingsPage = createSectionPage(
  "audio_transcription",
  "global",
);

const CameraDetectSettingsPage = createSectionPage("detect", "camera");
const CameraFfmpegSettingsPage = createSectionPage("ffmpeg", "camera");
const CameraRecordingSettingsPage = createSectionPage("record", "camera");
const CameraSnapshotsSettingsPage = createSectionPage("snapshots", "camera");
const CameraMotionSettingsPage = createSectionPage("motion", "camera");
const CameraObjectsSettingsPage = createSectionPage("objects", "camera");
const CameraReviewSettingsPage = createSectionPage("review", "camera");
const CameraAudioEventsSettingsPage = createSectionPage("audio", "camera");
const CameraAudioTranscriptionSettingsPage = createSectionPage(
  "audio_transcription",
  "camera",
);
const CameraNotificationsSettingsPage = createSectionPage(
  "notifications",
  "camera",
);
const CameraLivePlaybackSettingsPage = createSectionPage("live", "camera");
const CameraBirdseyeSettingsPage = createSectionPage("birdseye", "camera");
const CameraFaceRecognitionSettingsPage = createSectionPage(
  "face_recognition",
  "camera",
);
const CameraLprSettingsPage = createSectionPage("lpr", "camera");
const CameraMqttConfigSettingsPage = createSectionPage("mqtt", "camera", {
  showOverrideIndicator: false,
});
const CameraOnvifSettingsPage = createSectionPage("onvif", "camera", {
  showOverrideIndicator: false,
});
const CameraUiSettingsPage = createSectionPage("ui", "camera", {
  showOverrideIndicator: false,
});
const CameraTimestampStyleSettingsPage = createSectionPage(
  "timestamp_style",
  "camera",
);

const settingsGroups = [
  {
    label: "general",
    items: [{ key: "profileSettings", component: UiSettingsView }],
  },
  {
    label: "globalConfig",
    items: [
      { key: "globalDetect", component: GlobalDetectSettingsPage },
      { key: "globalObjects", component: GlobalObjectsSettingsPage },
      { key: "globalMotion", component: GlobalMotionSettingsPage },
      { key: "globalFfmpeg", component: GlobalFfmpegSettingsPage },
      { key: "globalRecording", component: GlobalRecordingSettingsPage },
      { key: "globalSnapshots", component: GlobalSnapshotsSettingsPage },
      { key: "globalReview", component: GlobalReviewSettingsPage },
      { key: "globalAudioEvents", component: GlobalAudioEventsSettingsPage },
      {
        key: "globalLivePlayback",
        component: GlobalLivePlaybackSettingsPage,
      },
      {
        key: "globalTimestampStyle",
        component: GlobalTimestampStyleSettingsPage,
      },
    ],
  },
  {
    label: "cameras",
    items: [
      { key: "cameraManagement", component: CameraManagementView },
      { key: "cameraDetect", component: CameraDetectSettingsPage },
      { key: "cameraObjects", component: CameraObjectsSettingsPage },
      { key: "cameraMotion", component: CameraMotionSettingsPage },
      { key: "motionTuner", component: MotionTunerView },
      { key: "cameraFfmpeg", component: CameraFfmpegSettingsPage },
      { key: "cameraRecording", component: CameraRecordingSettingsPage },
      { key: "cameraSnapshots", component: CameraSnapshotsSettingsPage },
      { key: "masksAndZones", component: MasksAndZonesView },
      { key: "cameraReview", component: CameraReviewSettingsPage },
      { key: "cameraAudioEvents", component: CameraAudioEventsSettingsPage },
      {
        key: "cameraAudioTranscription",
        component: CameraAudioTranscriptionSettingsPage,
      },
      { key: "cameraBirdseye", component: CameraBirdseyeSettingsPage },
      {
        key: "cameraLivePlayback",
        component: CameraLivePlaybackSettingsPage,
      },
      {
        key: "cameraNotifications",
        component: CameraNotificationsSettingsPage,
      },
      {
        key: "cameraFaceRecognition",
        component: CameraFaceRecognitionSettingsPage,
      },
      { key: "cameraLpr", component: CameraLprSettingsPage },
      { key: "cameraOnvif", component: CameraOnvifSettingsPage },
      { key: "cameraMqttConfig", component: CameraMqttConfigSettingsPage },
      { key: "cameraUi", component: CameraUiSettingsPage },
      {
        key: "cameraTimestampStyle",
        component: CameraTimestampStyleSettingsPage,
      },
    ],
  },
  {
    label: "enrichments",
    items: [
      {
        key: "integrationSemanticSearch",
        component: IntegrationSemanticSearchSettingsPage,
      },
      {
        key: "integrationGenerativeAi",
        component: IntegrationGenerativeAiSettingsPage,
      },
      {
        key: "integrationFaceRecognition",
        component: IntegrationFaceRecognitionSettingsPage,
      },
      { key: "integrationLpr", component: IntegrationLprSettingsPage },
      {
        key: "integrationObjectClassification",
        component: IntegrationObjectClassificationSettingsPage,
      },
      { key: "triggers", component: TriggerView },
      {
        key: "integrationAudioTranscription",
        component: IntegrationAudioTranscriptionSettingsPage,
      },
    ],
  },
  {
    label: "system",
    items: [
      {
        key: "systemDetectorHardware",
        component: SystemDetectorHardwareSettingsPage,
      },
      {
        key: "systemDetectionModel",
        component: SystemDetectionModelSettingsPage,
      },
      { key: "systemDatabase", component: SystemDatabaseSettingsPage },
      { key: "systemMqtt", component: SystemMqttSettingsPage },
      { key: "systemBirdseye", component: SystemBirdseyeSettingsPage },
      { key: "systemTls", component: SystemTlsSettingsPage },
      {
        key: "systemAuthentication",
        component: SystemAuthenticationSettingsPage,
      },
      { key: "systemNetworking", component: SystemNetworkingSettingsPage },
      { key: "systemProxy", component: SystemProxySettingsPage },
      { key: "systemUi", component: SystemUiSettingsPage },
      { key: "systemLogging", component: SystemLoggingSettingsPage },
      {
        key: "systemEnvironmentVariables",
        component: SystemEnvironmentVariablesSettingsPage,
      },
      { key: "systemTelemetry", component: SystemTelemetrySettingsPage },
    ],
  },
  {
    label: "users",
    items: [
      { key: "users", component: UsersView },
      { key: "roles", component: RolesView },
    ],
  },
  {
    label: "notifications",
    items: [{ key: "notifications", component: NotificationsSettingsPage }],
  },
  {
    label: "frigateplus",
    items: [{ key: "frigateplus", component: FrigatePlusSettingsView }],
  },
  {
    label: "maintenance",
    items: [{ key: "maintenance", component: MaintenanceSettingsView }],
  },
];

const CAMERA_SELECT_BUTTON_PAGES = [
  "debug",
  "cameraDetect",
  "cameraFfmpeg",
  "cameraRecording",
  "cameraSnapshots",
  "cameraMotion",
  "cameraObjects",
  "cameraReview",
  "cameraAudioEvents",
  "cameraAudioTranscription",
  "cameraNotifications",
  "cameraLivePlayback",
  "cameraBirdseye",
  "cameraFaceRecognition",
  "cameraLpr",
  "cameraMqttConfig",
  "cameraOnvif",
  "cameraUi",
  "cameraTimestampStyle",
  "masksAndZones",
  "motionTuner",
  "triggers",
];

const ALLOWED_VIEWS_FOR_VIEWER = ["ui", "debug", "notifications"];

const LARGE_BOTTOM_MARGIN_PAGES = [
  "masksAndZones",
  "motionTuner",
  "maintenance",
];

// keys for camera sections
const CAMERA_SECTION_MAPPING: Record<string, SettingsType> = {
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
  mqtt: "cameraMqttConfig",
  onvif: "cameraOnvif",
  ui: "cameraUi",
  timestamp_style: "cameraTimestampStyle",
};

// keys for global sections
const GLOBAL_SECTION_MAPPING: Record<string, SettingsType> = {
  detect: "globalDetect",
  ffmpeg: "globalFfmpeg",
  record: "globalRecording",
  snapshots: "globalSnapshots",
  motion: "globalMotion",
  objects: "globalObjects",
  review: "globalReview",
  audio: "globalAudioEvents",
  live: "globalLivePlayback",
  timestamp_style: "globalTimestampStyle",
  notifications: "notifications",
};

const ENRICHMENTS_SECTION_MAPPING: Record<string, SettingsType> = {
  semantic_search: "integrationSemanticSearch",
  genai: "integrationGenerativeAi",
  face_recognition: "integrationFaceRecognition",
  lpr: "integrationLpr",
  classification: "integrationObjectClassification",
  audio_transcription: "integrationAudioTranscription",
};

const SYSTEM_SECTION_MAPPING: Record<string, SettingsType> = {
  database: "systemDatabase",
  mqtt: "systemMqtt",
  tls: "systemTls",
  auth: "systemAuthentication",
  networking: "systemNetworking",
  proxy: "systemProxy",
  ui: "systemUi",
  logger: "systemLogging",
  environment_vars: "systemEnvironmentVariables",
  telemetry: "systemTelemetry",
  birdseye: "systemBirdseye",
  detectors: "systemDetectorHardware",
  model: "systemDetectionModel",
};

const CAMERA_SECTION_KEYS = new Set<SettingsType>(
  Object.values(CAMERA_SECTION_MAPPING),
);

const getCurrentComponent = (page: SettingsType) => {
  for (const group of settingsGroups) {
    for (const item of group.items) {
      if (item.key === page) {
        return item.component;
      }
    }
  }
  return null;
};

function MobileMenuItem({
  item,
  onSelect,
  onClose,
  className,
  label,
}: {
  item: { key: string };
  onSelect: (key: string) => void;
  onClose?: () => void;
  className?: string;
  label?: ReactNode;
}) {
  const { t } = useTranslation(["views/settings"]);

  return (
    <div
      className={cn(
        "inline-flex h-10 w-full cursor-pointer items-center justify-between whitespace-nowrap rounded-md px-4 py-2 pr-2 text-sm font-medium text-primary-variant disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      onClick={() => {
        onSelect(item.key);
        onClose?.();
      }}
    >
      <div className="w-full">
        {label ?? <div>{t("menu." + item.key)}</div>}
      </div>
      <LuChevronRight className="size-4" />
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation(["views/settings"]);
  const [page, setPage] = useState<SettingsType>("profileSettings");
  const [pageToggle, setPageToggle] = useOptimisticState(page, setPage, 100);
  const [contentMobileOpen, setContentMobileOpen] = useState(false);
  const [sectionStatusByKey, setSectionStatusByKey] = useState<
    Partial<Record<SettingsType, SectionStatus>>
  >({});

  const { data: config } = useSWR<FrigateConfig>("config");

  const [searchParams] = useSearchParams();

  // auth and roles

  const isAdmin = useIsAdmin();

  const visibleSettingsViews = !isAdmin
    ? ALLOWED_VIEWS_FOR_VIEWER
    : allSettingsViews;

  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);

  // Store pending form data keyed by "sectionKey" or "cameraName::sectionKey"
  const [pendingDataBySection, setPendingDataBySection] = useState<
    Record<string, unknown>
  >({});

  const navigate = useNavigate();

  const cameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras)
      .filter((conf) => conf.ui.dashboard && conf.enabled_in_config)
      .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
  }, [config]);

  const [selectedCamera, setSelectedCamera] = useState<string>("");

  // Get all camera overrides for the selected camera
  const cameraOverrides = useAllCameraOverrides(config, selectedCamera);

  const { payload: allCameraStates } = useInitialCameraState(
    cameras.length > 0 ? cameras[0].name : "",
    true,
  );

  const cameraEnabledStates = useMemo(() => {
    const states: Record<string, boolean> = {};
    if (allCameraStates) {
      Object.entries(allCameraStates).forEach(([camName, state]) => {
        states[camName] = state.config?.enabled ?? false;
      });
    }
    // fallback to config if ws data isn’t available yet
    cameras.forEach((cam) => {
      if (!(cam.name in states)) {
        states[cam.name] = cam.enabled;
      }
    });
    return states;
  }, [allCameraStates, cameras]);

  const [filterZoneMask, setFilterZoneMask] = useState<PolygonType[]>();

  // Save All state
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const { send: sendRestart } = useRestart();
  const { data: fullSchema } = useSWR<RJSFSchema>("config/schema.json");

  const hasPendingChanges = Object.keys(pendingDataBySection).length > 0;
  const hasPendingValidationErrors = useMemo(
    () =>
      Object.values(sectionStatusByKey).some(
        (status) => !!status && status.hasChanges && status.hasValidationErrors,
      ),
    [sectionStatusByKey],
  );
  const pendingChangesPreview = useMemo<SaveAllPreviewItem[]>(() => {
    if (!config || !fullSchema) return [];

    const items: SaveAllPreviewItem[] = [];
    Object.entries(pendingDataBySection).forEach(
      ([pendingDataKey, pendingData]) => {
        const payload = prepareSectionSavePayload({
          pendingDataKey,
          pendingData,
          config,
          fullSchema,
        });

        if (!payload) return;

        const { scope, cameraName, sectionPath } =
          parsePendingDataKey(pendingDataKey);
        const flattened = flattenOverrides(payload.sanitizedOverrides);

        flattened.forEach(({ path, value }) => {
          const fieldPath = path ? `${sectionPath}.${path}` : sectionPath;
          items.push({ scope, cameraName, fieldPath, value });
        });
      },
    );

    return items.sort((left, right) => {
      const scopeCompare = left.scope.localeCompare(right.scope);
      if (scopeCompare !== 0) return scopeCompare;
      const cameraCompare = (left.cameraName ?? "").localeCompare(
        right.cameraName ?? "",
      );
      if (cameraCompare !== 0) return cameraCompare;
      return left.fieldPath.localeCompare(right.fieldPath);
    });
  }, [config, fullSchema, pendingDataBySection]);

  // Map a pendingDataKey to SettingsType menu key for clearing section status
  const pendingKeyToMenuKey = useCallback(
    (pendingDataKey: string): SettingsType | undefined => {
      let sectionPath: string;
      let level: "global" | "camera";

      if (pendingDataKey.includes("::")) {
        sectionPath = pendingDataKey.slice(pendingDataKey.indexOf("::") + 2);
        level = "camera";
      } else {
        sectionPath = pendingDataKey;
        level = "global";
      }

      if (level === "camera") {
        return CAMERA_SECTION_MAPPING[sectionPath] as SettingsType | undefined;
      }
      return (
        (GLOBAL_SECTION_MAPPING[sectionPath] as SettingsType | undefined) ??
        (ENRICHMENTS_SECTION_MAPPING[sectionPath] as
          | SettingsType
          | undefined) ??
        (SYSTEM_SECTION_MAPPING[sectionPath] as SettingsType | undefined)
      );
    },
    [],
  );

  const handleSaveAll = useCallback(async () => {
    if (
      !config ||
      !fullSchema ||
      !hasPendingChanges ||
      hasPendingValidationErrors
    )
      return;

    setIsSavingAll(true);
    let successCount = 0;
    let failCount = 0;
    let anyNeedsRestart = false;
    const savedKeys: string[] = [];

    const pendingKeys = Object.keys(pendingDataBySection);

    for (const key of pendingKeys) {
      const pendingData = pendingDataBySection[key];
      try {
        const payload = prepareSectionSavePayload({
          pendingDataKey: key,
          pendingData,
          config,
          fullSchema,
        });

        if (!payload) {
          // No actual overrides — clear the pending entry
          setPendingDataBySection((prev) => {
            const { [key]: _, ...rest } = prev;
            return rest;
          });
          successCount++;
          continue;
        }

        const configData = buildConfigDataForPath(
          payload.basePath,
          payload.sanitizedOverrides,
        );
        await axios.put("config/set", {
          requires_restart: payload.needsRestart ? 1 : 0,
          update_topic: payload.updateTopic,
          config_data: configData,
        });

        if (payload.needsRestart) {
          anyNeedsRestart = true;
        }

        // Clear pending entry on success
        setPendingDataBySection((prev) => {
          const { [key]: _, ...rest } = prev;
          return rest;
        });
        savedKeys.push(key);
        successCount++;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Save All – error saving", key, error);
        failCount++;
      }
    }

    // Refresh config from server once
    await mutate("config");

    // Clear hasChanges in sidebar for all successfully saved sections
    if (savedKeys.length > 0) {
      setSectionStatusByKey((prev) => {
        const updated = { ...prev };
        for (const key of savedKeys) {
          const menuKey = pendingKeyToMenuKey(key);
          if (menuKey && updated[menuKey]) {
            updated[menuKey] = {
              ...updated[menuKey],
              hasChanges: false,
              hasValidationErrors: false,
            };
          }
        }
        return updated;
      });
    }

    // Aggregate toast
    const totalCount = successCount + failCount;
    if (failCount === 0) {
      if (anyNeedsRestart) {
        toast.success(
          t("toast.saveAllSuccess", {
            ns: "views/settings",
            count: successCount,
          }),
          {
            action: (
              <a onClick={() => setRestartDialogOpen(true)}>
                <Button>
                  {t("restart.button", { ns: "components/dialog" })}
                </Button>
              </a>
            ),
          },
        );
      } else {
        toast.success(
          t("toast.saveAllSuccess", {
            ns: "views/settings",
            count: successCount,
          }),
        );
      }
    } else if (successCount > 0) {
      toast.warning(
        t("toast.saveAllPartial", {
          ns: "views/settings",
          count: totalCount,
          successCount,
          totalCount,
          failCount,
        }),
      );
    } else {
      toast.error(t("toast.saveAllFailure", { ns: "views/settings" }));
    }

    setIsSavingAll(false);
  }, [
    config,
    fullSchema,
    hasPendingChanges,
    hasPendingValidationErrors,
    pendingDataBySection,
    pendingKeyToMenuKey,
    t,
  ]);

  const handleUndoAll = useCallback(() => {
    const pendingKeys = Object.keys(pendingDataBySection);
    if (pendingKeys.length === 0) return;

    setPendingDataBySection({});
    setUnsavedChanges(false);

    setSectionStatusByKey((prev) => {
      const updated = { ...prev };
      for (const key of pendingKeys) {
        const menuKey = pendingKeyToMenuKey(key);
        if (menuKey && updated[menuKey]) {
          updated[menuKey] = {
            ...updated[menuKey],
            hasChanges: false,
            hasValidationErrors: false,
          };
        }
      }
      return updated;
    });
  }, [pendingDataBySection, pendingKeyToMenuKey]);

  const handleDialog = useCallback(
    (save: boolean) => {
      if (unsavedChanges && save) {
        handleSaveAll();
      }
      setConfirmationDialogOpen(false);
      setUnsavedChanges(false);
    },
    [unsavedChanges, handleSaveAll],
  );

  useEffect(() => {
    if (cameras.length > 0) {
      if (!selectedCamera) {
        // Set to first enabled camera initially if no selection
        const firstEnabledCamera =
          cameras.find((cam) => cameraEnabledStates[cam.name]) || cameras[0];
        setSelectedCamera(firstEnabledCamera.name);
      } else if (
        !cameraEnabledStates[selectedCamera] &&
        pageToggle !== "cameraReview"
      ) {
        // Switch to first enabled camera if current one is disabled, unless on "camera settings" page
        const firstEnabledCamera =
          cameras.find((cam) => cameraEnabledStates[cam.name]) || cameras[0];
        if (firstEnabledCamera.name !== selectedCamera) {
          setSelectedCamera(firstEnabledCamera.name);
        }
      }
    }
  }, [cameras, selectedCamera, cameraEnabledStates, pageToggle]);

  useSearchEffect("page", (page: string) => {
    if (allSettingsViews.includes(page as SettingsType)) {
      // Restrict viewer to UI settings
      if (
        !isAdmin &&
        !ALLOWED_VIEWS_FOR_VIEWER.includes(page as SettingsType)
      ) {
        setPageToggle("profileSettings");
      } else {
        setPageToggle(page as SettingsType);
      }
      if (isMobile) {
        setContentMobileOpen(true);
      }
    }
    // don't clear url params if we're creating a new object mask
    return !(searchParams.has("object_mask") || searchParams.has("event_id"));
  });

  useSearchEffect("camera", (camera: string) => {
    const cameraNames = cameras.map((c) => c.name);
    if (cameraNames.includes(camera)) {
      setSelectedCamera(camera);
      if (isMobile) {
        setContentMobileOpen(true);
      }
    }
    // don't clear url params if we're creating a new object mask or trigger
    return !(searchParams.has("object_mask") || searchParams.has("event_id"));
  });

  useEffect(() => {
    if (!contentMobileOpen) {
      document.title = t("documentTitle.default");
    }
  }, [t, contentMobileOpen]);

  const handleSectionStatusChange = useCallback(
    (sectionKey: string, level: "global" | "camera", status: SectionStatus) => {
      // Map section keys to menu keys based on level
      let menuKey: string;
      if (level === "camera") {
        menuKey = CAMERA_SECTION_MAPPING[sectionKey] || sectionKey;
      } else {
        menuKey =
          GLOBAL_SECTION_MAPPING[sectionKey] ||
          ENRICHMENTS_SECTION_MAPPING[sectionKey] ||
          SYSTEM_SECTION_MAPPING[sectionKey] ||
          sectionKey;
      }

      setSectionStatusByKey((prev) => ({
        ...prev,
        [menuKey]: status,
      }));
    },
    [],
  );

  const handlePendingDataChange = useCallback(
    (
      sectionKey: string,
      cameraName: string | undefined,
      data: ConfigSectionData | null,
    ) => {
      const pendingDataKey = cameraName
        ? `${cameraName}::${sectionKey}`
        : sectionKey;

      setPendingDataBySection((prev) => {
        if (data === null) {
          const { [pendingDataKey]: _, ...rest } = prev;
          return rest;
        }
        return {
          ...prev,
          [pendingDataKey]: data,
        };
      });
    },
    [],
  );

  // Initialize override status for all camera sections
  useEffect(() => {
    if (!selectedCamera || !cameraOverrides) return;

    const overrideMap: Partial<
      Record<SettingsType, Pick<SectionStatus, "hasChanges" | "isOverridden">>
    > = {};

    // Set override status for all camera sections using the shared mapping
    Object.entries(CAMERA_SECTION_MAPPING).forEach(
      ([sectionKey, settingsKey]) => {
        const isOverridden = cameraOverrides.includes(sectionKey);
        // Check if there are pending changes for this camera and section
        const pendingDataKey = `${selectedCamera}::${sectionKey}`;
        const hasChanges = pendingDataKey in pendingDataBySection;
        overrideMap[settingsKey] = {
          hasChanges,
          isOverridden,
        };
      },
    );

    setSectionStatusByKey((prev) => {
      // Merge and update both hasChanges and isOverridden for camera sections
      const merged = { ...prev };
      Object.entries(overrideMap).forEach(([key, status]) => {
        const existingStatus = merged[key as SettingsType];
        merged[key as SettingsType] = {
          hasChanges: status.hasChanges,
          isOverridden: status.isOverridden,
          hasValidationErrors: existingStatus?.hasValidationErrors ?? false,
        };
      });
      return merged;
    });
  }, [selectedCamera, cameraOverrides, pendingDataBySection]);

  const renderMenuItemLabel = useCallback(
    (key: SettingsType) => {
      const status = sectionStatusByKey[key];
      const showOverrideDot =
        CAMERA_SECTION_KEYS.has(key) && status?.isOverridden;
      const showUnsavedDot = status?.hasChanges;

      return (
        <div className="flex w-full items-center justify-between pr-4 md:pr-0">
          <div>{t("menu." + key)}</div>
          {(showOverrideDot || showUnsavedDot) && (
            <div className="ml-2 flex items-center gap-2">
              {showOverrideDot && (
                <span className="inline-block size-2 rounded-full bg-selected" />
              )}
              {showUnsavedDot && (
                <span className="inline-block size-2 rounded-full bg-danger" />
              )}
            </div>
          )}
        </div>
      );
    },
    [sectionStatusByKey, t],
  );

  if (isMobile) {
    return (
      <>
        <Toaster position="top-center" />
        {!contentMobileOpen && (
          <div
            key={`mobile-menu-${selectedCamera}`}
            className="flex size-full flex-col"
          >
            <div className="sticky -top-2 z-50 mb-2 bg-background p-4">
              <div className="relative flex w-full items-center justify-center">
                <Logo className="h-8" />
                <div className="absolute right-0">
                  <CameraSelectButton
                    allCameras={cameras}
                    selectedCamera={selectedCamera}
                    setSelectedCamera={setSelectedCamera}
                    cameraEnabledStates={cameraEnabledStates}
                    currentPage={page}
                  />
                </div>
              </div>
              <div className="flex flex-row text-center">
                <h2 className="ml-2 text-lg">
                  {t("menu.settings", { ns: "common" })}
                </h2>
              </div>
            </div>

            <div className="scrollbar-container overflow-y-auto px-4">
              {settingsGroups.map((group) => {
                const filteredItems = group.items.filter((item) =>
                  visibleSettingsViews.includes(item.key as SettingsType),
                );
                if (filteredItems.length === 0) return null;
                return (
                  <div key={group.label} className="mb-3">
                    {filteredItems.length > 1 && (
                      <h3 className="mb-2 ml-2 text-sm font-medium text-secondary-foreground">
                        <div>{t("menu." + group.label)}</div>
                      </h3>
                    )}
                    {filteredItems.map((item) => (
                      <MobileMenuItem
                        key={item.key}
                        item={item}
                        className={cn(filteredItems.length == 1 && "pl-2")}
                        label={renderMenuItemLabel(item.key as SettingsType)}
                        onSelect={(key) => {
                          if (
                            !isAdmin &&
                            !ALLOWED_VIEWS_FOR_VIEWER.includes(
                              key as SettingsType,
                            )
                          ) {
                            setPageToggle("profileSettings");
                          } else {
                            setPageToggle(key as SettingsType);
                          }
                          setContentMobileOpen(true);
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
            {hasPendingChanges && (
              <div className="sticky bottom-0 z-50 mt-2 bg-background p-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-danger">
                      {t("unsavedChanges", {
                        ns: "views/settings",
                        defaultValue: "You have unsaved changes",
                      })}
                    </span>
                    <SaveAllPreviewPopover
                      items={pendingChangesPreview}
                      className="h-7 w-7"
                      align="center"
                      side="top"
                    />
                  </div>

                  <Button
                    onClick={handleUndoAll}
                    variant="outline"
                    size="sm"
                    disabled={isSavingAll}
                    className="flex w-full items-center justify-center gap-2"
                  >
                    {t("button.undoAll", {
                      ns: "common",
                      defaultValue: "Undo All",
                    })}
                  </Button>
                  <Button
                    onClick={handleSaveAll}
                    variant="select"
                    size="sm"
                    disabled={isSavingAll || hasPendingValidationErrors}
                    className="flex w-full items-center justify-center gap-2"
                  >
                    {isSavingAll ? (
                      <>
                        <ActivityIndicator className="h-4 w-4" />
                        {t("button.savingAll", { ns: "common" })}
                      </>
                    ) : (
                      t("button.saveAll", { ns: "common" })
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        <MobilePage
          open={contentMobileOpen}
          onOpenChange={setContentMobileOpen}
        >
          <MobilePageContent
            className={cn("px-2", "scrollbar-container overflow-y-auto")}
          >
            <MobilePageHeader
              className="top-0 mb-0"
              onClose={() => navigate(-1)}
              actions={
                <div className="flex items-center gap-2">
                  {CAMERA_SELECT_BUTTON_PAGES.includes(pageToggle) && (
                    <>
                      {pageToggle == "masksAndZones" && (
                        <ZoneMaskFilterButton
                          selectedZoneMask={filterZoneMask}
                          updateZoneMaskFilter={setFilterZoneMask}
                        />
                      )}
                      <CameraSelectButton
                        allCameras={cameras}
                        selectedCamera={selectedCamera}
                        setSelectedCamera={setSelectedCamera}
                        cameraEnabledStates={cameraEnabledStates}
                        currentPage={page}
                      />
                    </>
                  )}
                </div>
              }
            >
              <MobilePageTitle>{t("menu." + page)}</MobilePageTitle>
            </MobilePageHeader>

            <div className="p-2">
              {(() => {
                const CurrentComponent = getCurrentComponent(page);
                if (!CurrentComponent) return null;
                return (
                  <CurrentComponent
                    selectedCamera={selectedCamera}
                    setUnsavedChanges={setUnsavedChanges}
                    selectedZoneMask={filterZoneMask}
                    onSectionStatusChange={handleSectionStatusChange}
                    pendingDataBySection={pendingDataBySection}
                    onPendingDataChange={handlePendingDataChange}
                  />
                );
              })()}
            </div>
          </MobilePageContent>
        </MobilePage>
        {confirmationDialogOpen && (
          <AlertDialog
            open={confirmationDialogOpen}
            onOpenChange={() => setConfirmationDialogOpen(false)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("dialog.unsavedChanges.title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("dialog.unsavedChanges.desc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => handleDialog(false)}>
                  {t("button.cancel", { ns: "common" })}
                </AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDialog(true)}>
                  {t("button.save", { ns: "common" })}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <RestartDialog
          isOpen={restartDialogOpen}
          onClose={() => setRestartDialogOpen(false)}
          onRestart={() => sendRestart("restart")}
        />
      </>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Toaster position="top-center" />
      <div className="flex min-h-16 items-center justify-between border-b border-secondary p-3">
        <Heading as="h3" className="mb-0">
          {t("menu.settings", { ns: "common" })}
        </Heading>
        <div className="flex items-center gap-5">
          {hasPendingChanges && (
            <div
              className={cn(
                "flex flex-row items-center gap-2",
                CAMERA_SELECT_BUTTON_PAGES.includes(page) &&
                  "border-r border-secondary pr-5",
              )}
            >
              <SaveAllPreviewPopover
                items={pendingChangesPreview}
                className="size-8"
                align="end"
                side="bottom"
              />
              <Button
                onClick={handleUndoAll}
                variant="outline"
                size="sm"
                disabled={isSavingAll}
                className="flex items-center justify-center gap-2"
              >
                {t("button.undoAll", {
                  ns: "common",
                  defaultValue: "Undo All",
                })}
              </Button>
              <Button
                variant="select"
                size="sm"
                onClick={handleSaveAll}
                disabled={isSavingAll || hasPendingValidationErrors}
                className="flex items-center justify-center gap-2"
              >
                {isSavingAll ? (
                  <>
                    <ActivityIndicator className="mr-2" />
                    {t("button.savingAll", { ns: "common" })}
                  </>
                ) : (
                  t("button.saveAll", { ns: "common" })
                )}
              </Button>
            </div>
          )}
          {CAMERA_SELECT_BUTTON_PAGES.includes(page) && (
            <>
              {pageToggle == "masksAndZones" && (
                <ZoneMaskFilterButton
                  selectedZoneMask={filterZoneMask}
                  updateZoneMaskFilter={setFilterZoneMask}
                />
              )}
              <CameraSelectButton
                allCameras={cameras}
                selectedCamera={selectedCamera}
                setSelectedCamera={setSelectedCamera}
                cameraEnabledStates={cameraEnabledStates}
                currentPage={page}
              />
            </>
          )}
        </div>
      </div>
      <SidebarProvider>
        <Sidebar variant="inset" className="relative mb-8 pl-0 pt-0">
          <SidebarContent className="scrollbar-container mb-24 overflow-y-auto border-r-[1px] border-secondary bg-background py-2">
            <SidebarMenu>
              {settingsGroups.map((group) => {
                const filteredItems = group.items.filter((item) =>
                  visibleSettingsViews.includes(item.key as SettingsType),
                );
                if (filteredItems.length === 0) return null;
                return (
                  <SidebarGroup key={group.label} className="py-1">
                    {filteredItems.length === 1 ? (
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            className="ml-0"
                            isActive={pageToggle === filteredItems[0].key}
                            onClick={() => {
                              if (
                                !isAdmin &&
                                !ALLOWED_VIEWS_FOR_VIEWER.includes(
                                  filteredItems[0].key as SettingsType,
                                )
                              ) {
                                setPageToggle("profileSettings");
                              } else {
                                setPageToggle(
                                  filteredItems[0].key as SettingsType,
                                );
                              }
                            }}
                          >
                            {renderMenuItemLabel(
                              filteredItems[0].key as SettingsType,
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    ) : (
                      <>
                        <SidebarGroupLabel
                          className={cn(
                            "ml-2 cursor-default pl-0 text-sm",
                            filteredItems.some(
                              (item) => pageToggle === item.key,
                            )
                              ? "text-primary"
                              : "text-sidebar-foreground/80",
                          )}
                        >
                          <div>{t("menu." + group.label)}</div>
                        </SidebarGroupLabel>
                        <SidebarMenuSub className="mx-2 border-0">
                          {filteredItems.map((item) => (
                            <SidebarMenuSubItem key={item.key}>
                              <SidebarMenuSubButton
                                isActive={pageToggle === item.key}
                                onClick={() => {
                                  if (
                                    !isAdmin &&
                                    !ALLOWED_VIEWS_FOR_VIEWER.includes(
                                      item.key as SettingsType,
                                    )
                                  ) {
                                    setPageToggle("profileSettings");
                                  } else {
                                    setPageToggle(item.key as SettingsType);
                                  }
                                }}
                              >
                                <div className="w-full cursor-pointer">
                                  {renderMenuItemLabel(
                                    item.key as SettingsType,
                                  )}
                                </div>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </>
                    )}
                  </SidebarGroup>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <div
            className={cn(
              "scrollbar-container mb-16 flex-1 overflow-y-auto p-2 pr-0",
              LARGE_BOTTOM_MARGIN_PAGES.includes(pageToggle) && "mb-24",
            )}
          >
            {(() => {
              const CurrentComponent = getCurrentComponent(page);
              if (!CurrentComponent) return null;
              return (
                <CurrentComponent
                  selectedCamera={selectedCamera}
                  setUnsavedChanges={setUnsavedChanges}
                  selectedZoneMask={filterZoneMask}
                  onSectionStatusChange={handleSectionStatusChange}
                  pendingDataBySection={pendingDataBySection}
                  onPendingDataChange={handlePendingDataChange}
                />
              );
            })()}
          </div>
        </SidebarInset>
        {confirmationDialogOpen && (
          <AlertDialog
            open={confirmationDialogOpen}
            onOpenChange={() => setConfirmationDialogOpen(false)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("dialog.unsavedChanges.title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("dialog.unsavedChanges.desc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => handleDialog(false)}>
                  {t("button.cancel", { ns: "common" })}
                </AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDialog(true)}>
                  {t("button.save", { ns: "common" })}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </SidebarProvider>
      <RestartDialog
        isOpen={restartDialogOpen}
        onClose={() => setRestartDialogOpen(false)}
        onRestart={() => sendRestart("restart")}
      />
    </div>
  );
}

type CameraSelectButtonProps = {
  allCameras: CameraConfig[];
  selectedCamera: string;
  setSelectedCamera: React.Dispatch<React.SetStateAction<string>>;
  cameraEnabledStates: Record<string, boolean>;
  currentPage: SettingsType;
};

function CameraSelectButton({
  allCameras,
  selectedCamera,
  setSelectedCamera,
  cameraEnabledStates,
  currentPage,
}: CameraSelectButtonProps) {
  const { t } = useTranslation(["views/settings"]);

  const [open, setOpen] = useState(false);

  if (!allCameras.length) {
    return null;
  }

  const trigger = (
    <Button
      className="flex items-center gap-2 bg-selected smart-capitalize hover:bg-selected"
      aria-label="Select a camera"
      size="sm"
    >
      <FaVideo className="text-background dark:text-primary" />
      <div className="hidden text-background dark:text-primary md:block">
        {selectedCamera == undefined ? (
          t("cameraSetting.noCamera")
        ) : (
          <CameraNameLabel camera={selectedCamera} />
        )}
      </div>
    </Button>
  );
  const content = (
    <>
      {isMobile && (
        <>
          <DropdownMenuLabel className="flex justify-center">
            {t("cameraSetting.camera")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
        </>
      )}
      <div className="scrollbar-container mb-5 h-auto max-h-[80dvh] overflow-y-auto overflow-x-hidden p-4 md:mb-1">
        <div className="flex flex-col gap-2.5">
          {allCameras.map((item) => {
            const isEnabled = cameraEnabledStates[item.name];
            const isCameraSettingsPage = currentPage === "cameraReview";
            return (
              <FilterSwitch
                key={item.name}
                isChecked={item.name === selectedCamera}
                label={item.name}
                type={"camera"}
                onCheckedChange={(isChecked) => {
                  if (isChecked && (isEnabled || isCameraSettingsPage)) {
                    setSelectedCamera(item.name);
                    setOpen(false);
                  }
                }}
                disabled={!isEnabled && !isCameraSettingsPage}
              />
            );
          })}
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setSelectedCamera(selectedCamera);
          }

          setOpen(open);
        }}
      >
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[75dvh] overflow-hidden">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu
      modal={false}
      open={open}
      onOpenChange={(open: boolean) => {
        if (!open) {
          setSelectedCamera(selectedCamera);
        }

        setOpen(open);
      }}
    >
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent>{content}</DropdownMenuContent>
    </DropdownMenu>
  );
}
