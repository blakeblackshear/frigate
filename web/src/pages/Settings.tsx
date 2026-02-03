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
import NotificationView from "@/views/settings/NotificationsSettingsView";
import UiSettingsView from "@/views/settings/UiSettingsView";
import FrigatePlusSettingsView from "@/views/settings/FrigatePlusSettingsView";
import MaintenanceSettingsView from "@/views/settings/MaintenanceSettingsView";
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
  "systemFfmpeg",
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
const SystemFfmpegSettingsPage = createSectionPage("ffmpeg", "global");
const SystemDetectorHardwareSettingsPage = createSectionPage(
  "detectors",
  "global",
);
const SystemDetectionModelSettingsPage = createSectionPage("model", "global");

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
      {
        key: "integrationAudioTranscription",
        component: IntegrationAudioTranscriptionSettingsPage,
      },
    ],
  },
  {
    label: "system",
    items: [
      { key: "systemDatabase", component: SystemDatabaseSettingsPage },
      { key: "systemMqtt", component: SystemMqttSettingsPage },
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
      { key: "systemBirdseye", component: SystemBirdseyeSettingsPage },
      { key: "systemFfmpeg", component: SystemFfmpegSettingsPage },
      {
        key: "systemDetectorHardware",
        component: SystemDetectorHardwareSettingsPage,
      },
      {
        key: "systemDetectionModel",
        component: SystemDetectionModelSettingsPage,
      },
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
    items: [
      { key: "notifications", component: NotificationView },
      { key: "triggers", component: TriggerView },
    ],
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
  record: "globalRecording",
  snapshots: "globalSnapshots",
  motion: "globalMotion",
  objects: "globalObjects",
  review: "globalReview",
  audio: "globalAudioEvents",
  live: "globalLivePlayback",
  timestamp_style: "globalTimestampStyle",
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
  ffmpeg: "systemFfmpeg",
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
        {label ?? (
          <div className="smart-capitalize">{t("menu." + item.key)}</div>
        )}
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

  // TODO: confirm leave page
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

  const handleDialog = useCallback(
    (save: boolean) => {
      if (unsavedChanges && save) {
        // TODO
      }
      setConfirmationDialogOpen(false);
      setUnsavedChanges(false);
    },
    [unsavedChanges],
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

    const overrideMap: Partial<Record<SettingsType, SectionStatus>> = {};

    // Set override status for all camera sections using the shared mapping
    Object.entries(CAMERA_SECTION_MAPPING).forEach(
      ([sectionKey, settingsKey]) => {
        const isOverridden = cameraOverrides.includes(sectionKey);
        overrideMap[settingsKey] = {
          hasChanges: false,
          isOverridden,
        };
      },
    );

    setSectionStatusByKey((prev) => {
      // Merge but preserve hasChanges from previous state
      const merged = { ...prev };
      Object.entries(overrideMap).forEach(([key, status]) => {
        merged[key as SettingsType] = {
          hasChanges: prev[key as SettingsType]?.hasChanges || false,
          isOverridden: status.isOverridden,
        };
      });
      return merged;
    });
  }, [selectedCamera, cameraOverrides]);

  const renderMenuItemLabel = useCallback(
    (key: SettingsType) => {
      const status = sectionStatusByKey[key];
      const showOverrideDot =
        CAMERA_SECTION_KEYS.has(key) && status?.isOverridden;
      const showUnsavedDot = status?.hasChanges;

      return (
        <div className="flex w-full items-center justify-between pr-4 md:pr-0">
          <div className="smart-capitalize">{t("menu." + key)}</div>
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
          <div className="flex size-full flex-col">
            <div className="sticky -top-2 z-50 mb-2 bg-background p-4">
              <div className="flex items-center justify-center">
                <Logo className="h-8" />
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
                        <div className="smart-capitalize">
                          {t("menu." + group.label)}
                        </div>
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
                CAMERA_SELECT_BUTTON_PAGES.includes(pageToggle) ? (
                  <div className="flex items-center gap-2">
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
                  </div>
                ) : undefined
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
      </>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Toaster position="top-center" />
      <div className="flex items-center justify-between border-b border-secondary p-3">
        <Heading as="h3" className="mb-0">
          {t("menu.settings", { ns: "common" })}
        </Heading>
        {CAMERA_SELECT_BUTTON_PAGES.includes(page) && (
          <div className="flex items-center gap-2">
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
          </div>
        )}
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
                          <div className="smart-capitalize">
                            {t("menu." + group.label)}
                          </div>
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
          <div className="scrollbar-container mb-24 flex-1 overflow-y-auto p-2 pr-0">
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
