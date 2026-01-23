// Camera Configuration View
// Per-camera configuration with tab navigation and override indicators

import { useMemo, useCallback, useState } from "react";
import useSWR from "swr";
import { useTranslation } from "react-i18next";
import {
  DetectSection,
  RecordSection,
  SnapshotsSection,
  MotionSection,
  ObjectsSection,
  ReviewSection,
  AudioSection,
  NotificationsSection,
  LiveSection,
  TimestampSection,
} from "@/components/config-form/sections";
import { useAllCameraOverrides } from "@/hooks/use-config-override";
import type { FrigateConfig } from "@/types/frigateConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { cn } from "@/lib/utils";

interface CameraConfigViewProps {
  /** Currently selected camera (from parent) */
  selectedCamera?: string;
  /** Callback when unsaved changes state changes */
  setUnsavedChanges?: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function CameraConfigView({
  selectedCamera: externalSelectedCamera,
  setUnsavedChanges,
}: CameraConfigViewProps) {
  const { t } = useTranslation(["views/settings"]);

  const { data: config, mutate: refreshConfig } =
    useSWR<FrigateConfig>("config");

  // Get list of cameras
  const cameras = useMemo(() => {
    if (!config?.cameras) return [];
    return Object.keys(config.cameras).sort();
  }, [config]);

  // Selected camera state (use external if provided, else internal)
  const [internalSelectedCamera, setInternalSelectedCamera] = useState<string>(
    cameras[0] || "",
  );
  const selectedCamera = externalSelectedCamera || internalSelectedCamera;

  // Get overridden sections for current camera
  const overriddenSections = useAllCameraOverrides(config, selectedCamera);

  const handleSave = useCallback(() => {
    refreshConfig();
    setUnsavedChanges?.(false);
  }, [refreshConfig, setUnsavedChanges]);

  const handleCameraChange = useCallback((camera: string) => {
    setInternalSelectedCamera(camera);
  }, []);

  if (!config) {
    return (
      <div className="flex h-full items-center justify-center">
        <ActivityIndicator />
      </div>
    );
  }

  if (cameras.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        {t("configForm.camera.noCameras", {
          defaultValue: "No cameras configured",
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {t("configForm.camera.title", {
            defaultValue: "Camera Configuration",
          })}
        </h2>
        <p className="text-muted-foreground">
          {t("configForm.camera.description", {
            defaultValue:
              "Configure settings for individual cameras. Overridden settings are highlighted.",
          })}
        </p>
      </div>

      {/* Camera Tabs - Only show if not externally controlled */}
      {!externalSelectedCamera && (
        <Tabs
          value={selectedCamera}
          onValueChange={handleCameraChange}
          className="w-full"
        >
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-max">
              {cameras.map((camera) => {
                const cameraOverrides = overriddenSections.filter((s) =>
                  s.startsWith(camera),
                );
                const hasOverrides = cameraOverrides.length > 0;
                const cameraConfig = config.cameras[camera];
                const displayName = cameraConfig?.name || camera;

                return (
                  <TabsTrigger
                    key={camera}
                    value={camera}
                    className="relative gap-2"
                  >
                    {displayName}
                    {hasOverrides && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                        {cameraOverrides.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </ScrollArea>

          {cameras.map((camera) => (
            <TabsContent key={camera} value={camera} className="mt-4">
              <CameraConfigContent
                cameraName={camera}
                config={config}
                overriddenSections={overriddenSections}
                onSave={handleSave}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Direct content when externally controlled */}
      {externalSelectedCamera && (
        <CameraConfigContent
          cameraName={externalSelectedCamera}
          config={config}
          overriddenSections={overriddenSections}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

interface CameraConfigContentProps {
  cameraName: string;
  config: FrigateConfig;
  overriddenSections: string[];
  onSave: () => void;
}

function CameraConfigContent({
  cameraName,
  config,
  overriddenSections,
  onSave,
}: CameraConfigContentProps) {
  const { t } = useTranslation(["views/settings"]);
  const [activeSection, setActiveSection] = useState("detect");

  const cameraConfig = config.cameras?.[cameraName];

  if (!cameraConfig) {
    return (
      <div className="text-muted-foreground">
        {t("configForm.camera.notFound", { defaultValue: "Camera not found" })}
      </div>
    );
  }

  const sections = [
    { key: "detect", label: "Detect", component: DetectSection },
    { key: "record", label: "Record", component: RecordSection },
    { key: "snapshots", label: "Snapshots", component: SnapshotsSection },
    { key: "motion", label: "Motion", component: MotionSection },
    { key: "objects", label: "Objects", component: ObjectsSection },
    { key: "review", label: "Review", component: ReviewSection },
    { key: "audio", label: "Audio", component: AudioSection },
    {
      key: "notifications",
      label: "Notifications",
      component: NotificationsSection,
    },
    { key: "live", label: "Live", component: LiveSection },
    { key: "timestamp_style", label: "Timestamp", component: TimestampSection },
  ];

  return (
    <div className="flex gap-6">
      {/* Section Navigation */}
      <nav className="w-48 shrink-0">
        <ul className="space-y-1">
          {sections.map((section) => {
            const isOverridden = overriddenSections.includes(section.key);
            return (
              <li key={section.key}>
                <button
                  onClick={() => setActiveSection(section.key)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                    activeSection === section.key
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <span>
                    {t(`configForm.${section.key}.title`, {
                      defaultValue: section.label,
                    })}
                  </span>
                  {isOverridden && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {t("common.modified", { defaultValue: "Modified" })}
                    </Badge>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Section Content */}
      <ScrollArea className="h-[calc(100vh-300px)] flex-1">
        <div className="pr-4">
          {sections.map((section) => {
            const SectionComponent = section.component;
            return (
              <div
                key={section.key}
                className={cn(
                  activeSection === section.key ? "block" : "hidden",
                )}
              >
                <SectionComponent
                  level="camera"
                  cameraName={cameraName}
                  showOverrideIndicator
                  onSave={onSave}
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
