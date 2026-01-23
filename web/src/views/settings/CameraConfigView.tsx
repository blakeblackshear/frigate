// Camera Configuration View
// Per-camera configuration with tab navigation and override indicators

import { useMemo, useCallback, useState, memo } from "react";
import useSWR from "swr";
import { useTranslation } from "react-i18next";
import { DetectSection } from "@/components/config-form/sections/DetectSection";
import { RecordSection } from "@/components/config-form/sections/RecordSection";
import { SnapshotsSection } from "@/components/config-form/sections/SnapshotsSection";
import { MotionSection } from "@/components/config-form/sections/MotionSection";
import { ObjectsSection } from "@/components/config-form/sections/ObjectsSection";
import { ReviewSection } from "@/components/config-form/sections/ReviewSection";
import { AudioSection } from "@/components/config-form/sections/AudioSection";
import { NotificationsSection } from "@/components/config-form/sections/NotificationsSection";
import { LiveSection } from "@/components/config-form/sections/LiveSection";
import { TimestampSection } from "@/components/config-form/sections/TimestampSection";
import { useAllCameraOverrides } from "@/hooks/use-config-override";
import type { FrigateConfig } from "@/types/frigateConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import Heading from "@/components/ui/heading";
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
    <div className="flex size-full flex-col">
      <div className="mb-4">
        <Heading as="h2">
          {t("configForm.camera.title", {
            defaultValue: "Camera Configuration",
          })}
        </Heading>
        <p className="text-sm text-muted-foreground">
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
          className="flex flex-1 flex-col"
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
            <TabsContent key={camera} value={camera} className="mt-4 flex-1">
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

const CameraConfigContent = memo(function CameraConfigContent({
  cameraName,
  config,
  overriddenSections,
  onSave,
}: CameraConfigContentProps) {
  const { t } = useTranslation([
    "config/detect",
    "config/record",
    "config/snapshots",
    "config/motion",
    "config/objects",
    "config/review",
    "config/audio",
    "config/notifications",
    "config/live",
    "config/timestamp_style",
    "views/settings",
    "common",
  ]);
  const [activeSection, setActiveSection] = useState("detect");

  const cameraConfig = config.cameras?.[cameraName];

  if (!cameraConfig) {
    return (
      <div className="text-muted-foreground">
        {t("configForm.camera.notFound", {
          ns: "views/settings",
          defaultValue: "Camera not found",
        })}
      </div>
    );
  }

  const sections = [
    {
      key: "detect",
      i18nNamespace: "config/detect",
      component: DetectSection,
    },
    {
      key: "record",
      i18nNamespace: "config/record",
      component: RecordSection,
    },
    {
      key: "snapshots",
      i18nNamespace: "config/snapshots",
      component: SnapshotsSection,
    },
    {
      key: "motion",
      i18nNamespace: "config/motion",
      component: MotionSection,
    },
    {
      key: "objects",
      i18nNamespace: "config/objects",
      component: ObjectsSection,
    },
    {
      key: "review",
      i18nNamespace: "config/review",
      component: ReviewSection,
    },
    { key: "audio", i18nNamespace: "config/audio", component: AudioSection },
    {
      key: "notifications",
      i18nNamespace: "config/notifications",
      component: NotificationsSection,
    },
    { key: "live", i18nNamespace: "config/live", component: LiveSection },
    {
      key: "timestamp_style",
      i18nNamespace: "config/timestamp_style",
      component: TimestampSection,
    },
  ];

  return (
    <div className="flex flex-1 gap-6 overflow-hidden">
      {/* Section Navigation */}
      <nav className="w-48 shrink-0">
        <ul className="space-y-1">
          {sections.map((section) => {
            const isOverridden = overriddenSections.includes(section.key);
            const sectionLabel = t("label", {
              ns: section.i18nNamespace,
              defaultValue:
                section.key.charAt(0).toUpperCase() +
                section.key.slice(1).replace(/_/g, " "),
            });

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
                  <span>{sectionLabel}</span>
                  {isOverridden && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {t("button.modified", {
                        ns: "common",
                        defaultValue: "Modified",
                      })}
                    </Badge>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Section Content */}
      <div className="scrollbar-container flex-1 overflow-y-auto pr-4">
        {sections.map((section) => {
          const SectionComponent = section.component;
          return (
            <div
              key={section.key}
              className={cn(activeSection === section.key ? "block" : "hidden")}
            >
              <SectionComponent
                level="camera"
                cameraName={cameraName}
                showOverrideIndicator
                onSave={onSave}
                showTitle={true}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});
