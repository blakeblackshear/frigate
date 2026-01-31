// Global Configuration View
// Main view for configuring global Frigate settings

import { useMemo, useCallback, useState } from "react";
import useSWR from "swr";
import { useTranslation } from "react-i18next";
import { DetectSection } from "@/components/config-form/sections/DetectSection";
import { RecordSection } from "@/components/config-form/sections/RecordSection";
import { SnapshotsSection } from "@/components/config-form/sections/SnapshotsSection";
import { MotionSection } from "@/components/config-form/sections/MotionSection";
import { ObjectsSection } from "@/components/config-form/sections/ObjectsSection";
import { ReviewSection } from "@/components/config-form/sections/ReviewSection";
import { AudioSection } from "@/components/config-form/sections/AudioSection";
import { AudioTranscriptionSection } from "@/components/config-form/sections/AudioTranscriptionSection";
import { AuthSection } from "@/components/config-form/sections/AuthSection";
import { BirdseyeSection } from "@/components/config-form/sections/BirdseyeSection";
import { ClassificationSection } from "@/components/config-form/sections/ClassificationSection";
import { DatabaseSection } from "@/components/config-form/sections/DatabaseSection";
import { DetectorsSection } from "@/components/config-form/sections/DetectorsSection";
import { EnvironmentVarsSection } from "@/components/config-form/sections/EnvironmentVarsSection";
import { FaceRecognitionSection } from "@/components/config-form/sections/FaceRecognitionSection";
import { FfmpegSection } from "@/components/config-form/sections/FfmpegSection";
import { GenaiSection } from "@/components/config-form/sections/GenaiSection";
import { LiveSection } from "@/components/config-form/sections/LiveSection";
import { LoggerSection } from "@/components/config-form/sections/LoggerSection";
import { LprSection } from "@/components/config-form/sections/LprSection";
import { ModelSection } from "@/components/config-form/sections/ModelSection";
import { MqttSection } from "@/components/config-form/sections/MqttSection";
import { NetworkingSection } from "@/components/config-form/sections/NetworkingSection";
import { ProxySection } from "@/components/config-form/sections/ProxySection";
import { SemanticSearchSection } from "@/components/config-form/sections/SemanticSearchSection";
import { TimestampSection } from "@/components/config-form/sections/TimestampSection";
import { TelemetrySection } from "@/components/config-form/sections/TelemetrySection";
import { TlsSection } from "@/components/config-form/sections/TlsSection";
import { UiSection } from "@/components/config-form/sections/UiSection";
import type { FrigateConfig } from "@/types/frigateConfig";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import Heading from "@/components/ui/heading";
import { cn } from "@/lib/utils";
import { getSectionConfig } from "@/components/config-form/sectionConfigs";

// Shared sections that can be overridden at camera level
const sharedSections = [
  { key: "detect", component: DetectSection },
  { key: "record", component: RecordSection },
  { key: "snapshots", component: SnapshotsSection },
  { key: "motion", component: MotionSection },
  { key: "objects", component: ObjectsSection },
  { key: "review", component: ReviewSection },
  { key: "audio", component: AudioSection },
  { key: "live", component: LiveSection },
  { key: "timestamp_style", component: TimestampSection },
];

// System sections (global only)
const systemSections = [
  { key: "database", component: DatabaseSection },
  { key: "tls", component: TlsSection },
  { key: "auth", component: AuthSection },
  { key: "networking", component: NetworkingSection },
  { key: "proxy", component: ProxySection },
  { key: "ui", component: UiSection },
  { key: "logger", component: LoggerSection },
  { key: "environment_vars", component: EnvironmentVarsSection },
  { key: "telemetry", component: TelemetrySection },
  { key: "birdseye", component: BirdseyeSection },
  { key: "ffmpeg", component: FfmpegSection },
  { key: "detectors", component: DetectorsSection },
  { key: "model", component: ModelSection },
];

// Integration sections (global only)
const integrationSections = [
  { key: "mqtt", component: MqttSection },
  { key: "semantic_search", component: SemanticSearchSection },
  { key: "genai", component: GenaiSection },
  { key: "face_recognition", component: FaceRecognitionSection },
  { key: "lpr", component: LprSection },
  { key: "classification", component: ClassificationSection },
  { key: "audio_transcription", component: AudioTranscriptionSection },
];

export default function GlobalConfigView() {
  const { t, i18n } = useTranslation([
    "views/settings",
    "config/global",
    "common",
  ]);
  const defaultSharedSection = sharedSections[0]?.key ?? "";
  const defaultSystemSection = systemSections[0]?.key ?? "";
  const defaultIntegrationSection = integrationSections[0]?.key ?? "";
  const [activeTab, setActiveTab] = useState("shared");
  const [activeSection, setActiveSection] = useState(defaultSharedSection);

  const { data: config, mutate: refreshConfig } =
    useSWR<FrigateConfig>("config");

  const handleSave = useCallback(() => {
    refreshConfig();
  }, [refreshConfig]);

  // Get the sections for the current tab
  const currentSections = useMemo(() => {
    if (activeTab === "shared") {
      return sharedSections;
    }
    if (activeTab === "system") {
      return systemSections;
    }
    return integrationSections;
  }, [activeTab]);

  // Reset active section when tab changes
  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      if (tab === "shared") {
        setActiveSection(defaultSharedSection);
      } else if (tab === "system") {
        setActiveSection(defaultSystemSection);
      } else {
        setActiveSection(defaultIntegrationSection);
      }
    },
    [defaultSharedSection, defaultSystemSection, defaultIntegrationSection],
  );

  if (!config) {
    return (
      <div className="flex h-full items-center justify-center">
        <ActivityIndicator />
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col">
      <div className="mb-4">
        <Heading as="h2">
          {t("configForm.global.title", {
            defaultValue: "Global Configuration",
          })}
        </Heading>
        <p className="text-sm text-muted-foreground">
          {t("configForm.global.description", {
            defaultValue:
              "Configure global settings that apply to all cameras by default.",
          })}
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="shared">
            {t("configForm.global.tabs.shared", {
              defaultValue: "Shared Defaults",
            })}
          </TabsTrigger>
          <TabsTrigger value="system">
            {t("configForm.global.tabs.system", { defaultValue: "System" })}
          </TabsTrigger>
          <TabsTrigger value="integrations">
            {t("configForm.global.tabs.integrations", {
              defaultValue: "Integrations",
            })}
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 flex flex-1 gap-6 overflow-hidden">
          {/* Section Navigation */}
          <nav className="w-64 shrink-0">
            <ul className="space-y-1">
              {currentSections.map((section) => {
                const defaultLabel =
                  section.key.charAt(0).toUpperCase() +
                  section.key.slice(1).replace(/_/g, " ");
                const sectionLabel = t(`${section.key}.label`, {
                  ns: "config/global",
                  defaultValue: defaultLabel,
                });

                return (
                  <li key={section.key}>
                    <button
                      onClick={() => setActiveSection(section.key)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                        activeSection === section.key
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted",
                      )}
                    >
                      <span>{sectionLabel}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Section Content */}
          <div className="scrollbar-container flex-1 overflow-y-auto pr-4">
            {currentSections.map((section) => {
              const SectionComponent = section.component;
              return (
                <div
                  key={section.key}
                  className={cn(
                    activeSection === section.key ? "block" : "hidden",
                  )}
                >
                  <Heading as="h4" className="mb-1">
                    {t(`${section.key}.label`, {
                      ns: "config/global",
                      defaultValue:
                        section.key.charAt(0).toUpperCase() +
                        section.key.slice(1).replace(/_/g, " "),
                    })}
                  </Heading>
                  {i18n.exists(`${section.key}.description`, {
                    ns: "config/global",
                  }) && (
                    <p className="mb-4 text-sm text-muted-foreground">
                      {t(`${section.key}.description`, {
                        ns: "config/global",
                      })}
                    </p>
                  )}

                  <SectionComponent
                    level="global"
                    onSave={handleSave}
                    showTitle={false}
                    sectionConfig={getSectionConfig(section.key, "global")}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </Tabs>
    </div>
  );
}
