// Global Configuration View
// Main view for configuring global Frigate settings

import { useMemo, useCallback, useState, memo } from "react";
import useSWR from "swr";
import axios from "axios";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ConfigForm } from "@/components/config-form/ConfigForm";
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
import type { RJSFSchema } from "@rjsf/utils";
import type { FrigateConfig } from "@/types/frigateConfig";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { extractSchemaSection } from "@/lib/config-schema";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import Heading from "@/components/ui/heading";
import { LuSave } from "react-icons/lu";
import isEqual from "lodash/isEqual";
import { cn } from "@/lib/utils";

// Shared sections that can be overridden at camera level
const sharedSections = [
  { key: "detect", i18nNamespace: "config/detect", component: DetectSection },
  { key: "record", i18nNamespace: "config/record", component: RecordSection },
  {
    key: "snapshots",
    i18nNamespace: "config/snapshots",
    component: SnapshotsSection,
  },
  { key: "motion", i18nNamespace: "config/motion", component: MotionSection },
  {
    key: "objects",
    i18nNamespace: "config/objects",
    component: ObjectsSection,
  },
  { key: "review", i18nNamespace: "config/review", component: ReviewSection },
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

// Section configurations for global-only settings (system and integrations)
const globalSectionConfigs: Record<
  string,
  {
    fieldOrder?: string[];
    hiddenFields?: string[];
    advancedFields?: string[];
    i18nNamespace: string;
  }
> = {
  mqtt: {
    i18nNamespace: "config/mqtt",
    fieldOrder: [
      "enabled",
      "host",
      "port",
      "user",
      "password",
      "topic_prefix",
      "client_id",
      "stats_interval",
      "tls_ca_certs",
      "tls_client_cert",
      "tls_client_key",
      "tls_insecure",
    ],
    advancedFields: [
      "stats_interval",
      "tls_ca_certs",
      "tls_client_cert",
      "tls_client_key",
      "tls_insecure",
    ],
  },
  database: {
    i18nNamespace: "config/database",
    fieldOrder: ["path"],
    advancedFields: [],
  },
  auth: {
    i18nNamespace: "config/auth",
    fieldOrder: [
      "enabled",
      "reset_admin_password",
      "native_oauth_url",
      "failed_login_rate_limit",
      "trusted_proxies",
    ],
    advancedFields: ["failed_login_rate_limit", "trusted_proxies"],
  },
  tls: {
    i18nNamespace: "config/tls",
    fieldOrder: ["enabled", "cert", "key"],
    advancedFields: [],
  },
  telemetry: {
    i18nNamespace: "config/telemetry",
    fieldOrder: ["network_interfaces", "stats", "version_check"],
    advancedFields: ["stats"],
  },
  birdseye: {
    i18nNamespace: "config/birdseye",
    fieldOrder: [
      "enabled",
      "restream",
      "width",
      "height",
      "quality",
      "mode",
      "layout",
      "inactivity_threshold",
    ],
    advancedFields: ["width", "height", "quality", "inactivity_threshold"],
  },
  semantic_search: {
    i18nNamespace: "config/semantic_search",
    fieldOrder: ["enabled", "reindex", "model_size"],
    advancedFields: ["reindex"],
  },
  face_recognition: {
    i18nNamespace: "config/face_recognition",
    fieldOrder: ["enabled", "threshold", "min_area", "model_size"],
    advancedFields: ["threshold", "min_area"],
  },
  lpr: {
    i18nNamespace: "config/lpr",
    fieldOrder: [
      "enabled",
      "threshold",
      "min_area",
      "min_ratio",
      "max_ratio",
      "model_size",
    ],
    advancedFields: ["threshold", "min_area", "min_ratio", "max_ratio"],
  },
};

// System sections (global only)
const systemSections = ["database", "tls", "auth", "telemetry", "birdseye"];

// Integration sections (global only)
const integrationSections = [
  "mqtt",
  "semantic_search",
  "face_recognition",
  "lpr",
];

interface GlobalConfigSectionProps {
  sectionKey: string;
  schema: RJSFSchema | null;
  config: FrigateConfig | undefined;
  onSave: () => void;
}

const GlobalConfigSection = memo(function GlobalConfigSection({
  sectionKey,
  schema,
  config,
  onSave,
}: GlobalConfigSectionProps) {
  const sectionConfig = globalSectionConfigs[sectionKey];
  const { t } = useTranslation([
    sectionConfig?.i18nNamespace || "common",
    "views/settings",
    "common",
  ]);
  const [pendingData, setPendingData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const formData = useMemo((): Record<string, unknown> => {
    if (!config) return {} as Record<string, unknown>;
    const value = (config as unknown as Record<string, unknown>)[sectionKey];
    return (
      (value as Record<string, unknown>) || ({} as Record<string, unknown>)
    );
  }, [config, sectionKey]);

  const hasChanges = useMemo(() => {
    if (!pendingData) return false;
    return !isEqual(formData, pendingData);
  }, [formData, pendingData]);

  const handleChange = useCallback((data: Record<string, unknown>) => {
    setPendingData(data);
  }, []);

  const handleSave = useCallback(async () => {
    if (!pendingData) return;

    setIsSaving(true);
    try {
      await axios.put("config/set", {
        update_topic: `config/${sectionKey}`,
        config_data: {
          [sectionKey]: pendingData,
        },
      });

      toast.success(
        t("toast.success", {
          ns: "views/settings",
          defaultValue: "Settings saved successfully",
        }),
      );

      setPendingData(null);
      onSave();
    } catch {
      toast.error(
        t("toast.error", {
          ns: "views/settings",
          defaultValue: "Failed to save settings",
        }),
      );
    } finally {
      setIsSaving(false);
    }
  }, [sectionKey, pendingData, t, onSave]);

  if (!schema || !sectionConfig) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ConfigForm
        schema={schema}
        formData={pendingData || formData}
        onChange={handleChange}
        fieldOrder={sectionConfig.fieldOrder}
        hiddenFields={sectionConfig.hiddenFields}
        advancedFields={sectionConfig.advancedFields}
        showSubmit={false}
        i18nNamespace={sectionConfig.i18nNamespace}
        disabled={isSaving}
      />

      <div className="flex items-center justify-between pt-2">
        <div>
          {hasChanges && (
            <span className="text-sm text-muted-foreground">
              {t("unsavedChanges", {
                ns: "views/settings",
                defaultValue: "You have unsaved changes",
              })}
            </span>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="gap-2"
        >
          <LuSave className="h-4 w-4" />
          {isSaving
            ? t("saving", { ns: "common", defaultValue: "Saving..." })
            : t("save", { ns: "common", defaultValue: "Save" })}
        </Button>
      </div>
    </div>
  );
});

export default function GlobalConfigView() {
  const { t } = useTranslation([
    "views/settings",
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
    "config/mqtt",
    "config/database",
    "config/auth",
    "config/tls",
    "config/telemetry",
    "config/birdseye",
    "config/semantic_search",
    "config/face_recognition",
    "config/lpr",
    "common",
  ]);
  const [activeTab, setActiveTab] = useState("shared");
  const [activeSection, setActiveSection] = useState("detect");

  const { data: config, mutate: refreshConfig } =
    useSWR<FrigateConfig>("config");
  const { data: schema } = useSWR<RJSFSchema>("config/schema.json");

  const handleSave = useCallback(() => {
    refreshConfig();
  }, [refreshConfig]);

  // Get the sections for the current tab
  const currentSections = useMemo(() => {
    if (activeTab === "shared") {
      return sharedSections;
    } else if (activeTab === "system") {
      return systemSections.map((key) => ({
        key,
        i18nNamespace: globalSectionConfigs[key].i18nNamespace,
        component: null, // Uses GlobalConfigSection instead
      }));
    } else {
      return integrationSections.map((key) => ({
        key,
        i18nNamespace: globalSectionConfigs[key].i18nNamespace,
        component: null,
      }));
    }
  }, [activeTab]);

  // Reset active section when tab changes
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (tab === "shared") {
      setActiveSection("detect");
    } else if (tab === "system") {
      setActiveSection("database");
    } else {
      setActiveSection("mqtt");
    }
  }, []);

  if (!config || !schema) {
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
          <nav className="w-48 shrink-0">
            <ul className="space-y-1">
              {currentSections.map((section) => {
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
            {activeTab === "shared" && (
              <>
                {sharedSections.map((section) => {
                  const SectionComponent = section.component;
                  return (
                    <div
                      key={section.key}
                      className={cn(
                        activeSection === section.key ? "block" : "hidden",
                      )}
                    >
                      <Heading as="h4" className="mb-4">
                        {t("label", {
                          ns: section.i18nNamespace,
                          defaultValue:
                            section.key.charAt(0).toUpperCase() +
                            section.key.slice(1).replace(/_/g, " "),
                        })}
                      </Heading>
                      <SectionComponent
                        level="global"
                        onSave={handleSave}
                        showTitle={false}
                      />
                    </div>
                  );
                })}
              </>
            )}

            {activeTab === "system" && (
              <>
                {systemSections.map((sectionKey) => (
                  <div
                    key={sectionKey}
                    className={cn(
                      activeSection === sectionKey ? "block" : "hidden",
                    )}
                  >
                    <Heading as="h4" className="mb-4">
                      {t("label", {
                        ns: globalSectionConfigs[sectionKey].i18nNamespace,
                        defaultValue:
                          sectionKey.charAt(0).toUpperCase() +
                          sectionKey.slice(1).replace(/_/g, " "),
                      })}
                    </Heading>
                    <GlobalConfigSection
                      sectionKey={sectionKey}
                      schema={extractSchemaSection(schema, sectionKey)}
                      config={config}
                      onSave={handleSave}
                    />
                  </div>
                ))}
              </>
            )}

            {activeTab === "integrations" && (
              <>
                {integrationSections.map((sectionKey) => (
                  <div
                    key={sectionKey}
                    className={cn(
                      activeSection === sectionKey ? "block" : "hidden",
                    )}
                  >
                    <Heading as="h4" className="mb-4">
                      {t("label", {
                        ns: globalSectionConfigs[sectionKey].i18nNamespace,
                        defaultValue:
                          sectionKey.charAt(0).toUpperCase() +
                          sectionKey.slice(1).replace(/_/g, " "),
                      })}
                    </Heading>
                    <GlobalConfigSection
                      sectionKey={sectionKey}
                      schema={extractSchemaSection(schema, sectionKey)}
                      config={config}
                      onSave={handleSave}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}
