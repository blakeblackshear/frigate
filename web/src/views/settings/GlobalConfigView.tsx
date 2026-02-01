// Global Configuration View
// Main view for configuring global Frigate settings

import { useMemo, useCallback, useState } from "react";
import useSWR from "swr";
import { useTranslation } from "react-i18next";
import { ConfigSectionTemplate } from "@/components/config-form/sections";
import type { FrigateConfig } from "@/types/frigateConfig";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import Heading from "@/components/ui/heading";
import { cn } from "@/lib/utils";
// Shared sections that can be overridden at camera level
const sharedSections = [
  { key: "detect" },
  { key: "record" },
  { key: "snapshots" },
  { key: "motion" },
  { key: "objects" },
  { key: "review" },
  { key: "audio" },
  { key: "live" },
  { key: "timestamp_style" },
];

// System sections (global only)
const systemSections = [
  { key: "database" },
  { key: "tls" },
  { key: "auth" },
  { key: "networking" },
  { key: "proxy" },
  { key: "ui" },
  { key: "logger" },
  { key: "environment_vars" },
  { key: "telemetry" },
  { key: "birdseye" },
  { key: "ffmpeg" },
  { key: "detectors" },
  { key: "model" },
];

// Integration sections (global only)
const integrationSections = [
  { key: "mqtt" },
  { key: "semantic_search" },
  { key: "genai" },
  { key: "face_recognition" },
  { key: "lpr" },
  { key: "classification" },
  { key: "audio_transcription" },
];

export default function GlobalConfigView() {
  const { t } = useTranslation(["views/settings", "config/global", "common"]);
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
            {currentSections.map((section) => (
              <div
                key={section.key}
                className={cn(
                  activeSection === section.key ? "block" : "hidden",
                )}
              >
                <ConfigSectionTemplate
                  sectionKey={section.key}
                  level="global"
                  onSave={handleSave}
                  showTitle={true}
                />
              </div>
            ))}
          </div>
        </div>
      </Tabs>
    </div>
  );
}
