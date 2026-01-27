// Global Configuration View
// Main view for configuring global Frigate settings

import { useMemo, useCallback, useState, useEffect, useRef } from "react";
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
import { LiveSection } from "@/components/config-form/sections/LiveSection";
import { TimestampSection } from "@/components/config-form/sections/TimestampSection";
import type { RJSFSchema } from "@rjsf/utils";
import type { FrigateConfig } from "@/types/frigateConfig";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    liveValidate?: boolean;
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
      "qos",
      "tls_ca_certs",
      "tls_client_cert",
      "tls_client_key",
      "tls_insecure",
    ],
    advancedFields: [
      "stats_interval",
      "qos",
      "tls_ca_certs",
      "tls_client_cert",
      "tls_client_key",
      "tls_insecure",
    ],
    liveValidate: true,
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
      "cookie_name",
      "cookie_secure",
      "session_length",
      "refresh_time",
      "native_oauth_url",
      "failed_login_rate_limit",
      "trusted_proxies",
      "hash_iterations",
      "roles",
    ],
    hiddenFields: ["admin_first_time_login"],
    advancedFields: [
      "cookie_name",
      "cookie_secure",
      "session_length",
      "refresh_time",
      "failed_login_rate_limit",
      "trusted_proxies",
      "hash_iterations",
      "roles",
    ],
  },
  tls: {
    i18nNamespace: "config/tls",
    fieldOrder: ["enabled", "cert", "key"],
    advancedFields: [],
  },
  networking: {
    i18nNamespace: "config/networking",
    fieldOrder: ["ipv6"],
    advancedFields: [],
  },
  proxy: {
    i18nNamespace: "config/proxy",
    fieldOrder: [
      "header_map",
      "logout_url",
      "auth_secret",
      "default_role",
      "separator",
    ],
    advancedFields: ["header_map", "auth_secret", "separator"],
    liveValidate: true,
  },
  ui: {
    i18nNamespace: "config/ui",
    fieldOrder: [
      "timezone",
      "time_format",
      "date_style",
      "time_style",
      "unit_system",
    ],
    advancedFields: [],
  },
  logger: {
    i18nNamespace: "config/logger",
    fieldOrder: ["default", "logs"],
    advancedFields: ["logs"],
  },
  environment_vars: {
    i18nNamespace: "config/environment_vars",
    fieldOrder: [],
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
      "idle_heartbeat_fps",
    ],
    advancedFields: ["width", "height", "quality", "inactivity_threshold"],
  },
  ffmpeg: {
    i18nNamespace: "config/ffmpeg",
    fieldOrder: [
      "path",
      "global_args",
      "hwaccel_args",
      "input_args",
      "output_args",
      "retry_interval",
      "apple_compatibility",
      "gpu",
    ],
    advancedFields: [
      "global_args",
      "hwaccel_args",
      "input_args",
      "output_args",
      "retry_interval",
      "apple_compatibility",
      "gpu",
    ],
  },
  detectors: {
    i18nNamespace: "config/detectors",
    fieldOrder: [],
    advancedFields: [],
  },
  model: {
    i18nNamespace: "config/model",
    fieldOrder: [
      "path",
      "labelmap_path",
      "width",
      "height",
      "input_pixel_format",
      "input_tensor",
      "input_dtype",
      "model_type",
      "labelmap",
      "attributes_map",
    ],
    advancedFields: [
      "labelmap",
      "attributes_map",
      "input_pixel_format",
      "input_tensor",
      "input_dtype",
      "model_type",
    ],
  },
  genai: {
    i18nNamespace: "config/genai",
    fieldOrder: [
      "provider",
      "api_key",
      "base_url",
      "model",
      "provider_options",
      "runtime_options",
    ],
    advancedFields: ["base_url", "provider_options", "runtime_options"],
  },
  classification: {
    i18nNamespace: "config/classification",
    fieldOrder: ["bird", "custom"],
    advancedFields: [],
  },
  semantic_search: {
    i18nNamespace: "config/semantic_search",
    fieldOrder: ["enabled", "reindex", "model", "model_size", "device"],
    advancedFields: ["reindex", "device"],
  },
  audio_transcription: {
    i18nNamespace: "config/audio_transcription",
    fieldOrder: ["enabled", "language", "device", "model_size", "live_enabled"],
    advancedFields: ["language", "device", "model_size"],
  },
  face_recognition: {
    i18nNamespace: "config/face_recognition",
    fieldOrder: [
      "enabled",
      "model_size",
      "unknown_score",
      "detection_threshold",
      "recognition_threshold",
      "min_area",
      "min_faces",
      "save_attempts",
      "blur_confidence_filter",
      "device",
    ],
    advancedFields: [
      "unknown_score",
      "detection_threshold",
      "recognition_threshold",
      "min_area",
      "min_faces",
      "save_attempts",
      "blur_confidence_filter",
      "device",
    ],
  },
  lpr: {
    i18nNamespace: "config/lpr",
    fieldOrder: [
      "enabled",
      "model_size",
      "detection_threshold",
      "min_area",
      "recognition_threshold",
      "min_plate_length",
      "format",
      "match_distance",
      "known_plates",
      "enhancement",
      "debug_save_plates",
      "device",
      "replace_rules",
    ],
    advancedFields: [
      "detection_threshold",
      "recognition_threshold",
      "min_plate_length",
      "format",
      "match_distance",
      "known_plates",
      "enhancement",
      "debug_save_plates",
      "device",
      "replace_rules",
    ],
  },
  go2rtc: {
    i18nNamespace: "config/go2rtc",
    fieldOrder: [],
    advancedFields: [],
  },
};

// System sections (global only)
const systemSections = [
  "database",
  "tls",
  "auth",
  "networking",
  "proxy",
  "ui",
  "logger",
  "environment_vars",
  "telemetry",
  "birdseye",
  "ffmpeg",
  "detectors",
  "model",
  "classification",
  "go2rtc",
];

// Integration sections (global only)
const integrationSections = [
  "mqtt",
  "audio_transcription",
  "genai",
  "semantic_search",
  "face_recognition",
  "lpr",
];

interface GlobalConfigSectionProps {
  sectionKey: string;
  schema: RJSFSchema | null;
  config: FrigateConfig | undefined;
  onSave: () => void;
  title: string;
}

function GlobalConfigSection({
  sectionKey,
  schema,
  config,
  onSave,
  title,
}: GlobalConfigSectionProps) {
  const sectionConfig = globalSectionConfigs[sectionKey];
  const { t } = useTranslation([
    sectionConfig?.i18nNamespace || "common",
    "views/settings",
    "common",
  ]);
  const [pendingData, setPendingData] = useState<unknown | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const isResettingRef = useRef(false);

  const formData = useMemo((): unknown => {
    if (!config) return {};
    return (config as unknown as Record<string, unknown>)[sectionKey];
  }, [config, sectionKey]);

  useEffect(() => {
    setPendingData(null);
  }, [formData]);

  useEffect(() => {
    if (isResettingRef.current) {
      isResettingRef.current = false;
    }
  }, [formKey]);

  const hasChanges = useMemo(() => {
    if (!pendingData) return false;
    return !isEqual(formData, pendingData);
  }, [formData, pendingData]);

  const handleChange = useCallback(
    (data: unknown) => {
      if (isResettingRef.current) {
        setPendingData(null);
        return;
      }
      if (!data || typeof data !== "object") {
        setPendingData(null);
        return;
      }
      if (isEqual(formData, data)) {
        setPendingData(null);
        return;
      }
      setPendingData(data);
    },
    [formData],
  );

  const handleReset = useCallback(() => {
    isResettingRef.current = true;
    setPendingData(null);
    setFormKey((prev) => prev + 1);
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
      <div className="flex items-center gap-3">
        <Heading as="h4">{title}</Heading>
        {hasChanges && (
          <Badge variant="outline" className="text-xs">
            {t("modified", { ns: "common", defaultValue: "Modified" })}
          </Badge>
        )}
      </div>
      <ConfigForm
        key={formKey}
        schema={schema}
        formData={pendingData || formData}
        onChange={handleChange}
        fieldOrder={sectionConfig.fieldOrder}
        hiddenFields={sectionConfig.hiddenFields}
        advancedFields={sectionConfig.advancedFields}
        liveValidate={sectionConfig.liveValidate}
        showSubmit={false}
        i18nNamespace={sectionConfig.i18nNamespace}
        disabled={isSaving}
      />

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-muted-foreground">
              {t("unsavedChanges", {
                ns: "views/settings",
                defaultValue: "You have unsaved changes",
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={isSaving}
              className="gap-2"
            >
              {t("reset", { ns: "common", defaultValue: "Reset" })}
            </Button>
          )}
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
    </div>
  );
}

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
    "config/audio_transcription",
    "config/database",
    "config/auth",
    "config/tls",
    "config/networking",
    "config/proxy",
    "config/ui",
    "config/logger",
    "config/environment_vars",
    "config/telemetry",
    "config/birdseye",
    "config/ffmpeg",
    "config/detectors",
    "config/model",
    "config/genai",
    "config/classification",
    "config/semantic_search",
    "config/face_recognition",
    "config/lpr",
    "config/go2rtc",
    "config/camera_groups",
    "config/safe_mode",
    "config/version",
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
                {systemSections.map((sectionKey) => {
                  const sectionTitle = t("label", {
                    ns: globalSectionConfigs[sectionKey].i18nNamespace,
                    defaultValue:
                      sectionKey.charAt(0).toUpperCase() +
                      sectionKey.slice(1).replace(/_/g, " "),
                  });

                  return (
                    <div
                      key={sectionKey}
                      className={cn(
                        activeSection === sectionKey ? "block" : "hidden",
                      )}
                    >
                      <GlobalConfigSection
                        sectionKey={sectionKey}
                        schema={extractSchemaSection(schema, sectionKey)}
                        config={config}
                        onSave={handleSave}
                        title={sectionTitle}
                      />
                    </div>
                  );
                })}
              </>
            )}

            {activeTab === "integrations" && (
              <>
                {integrationSections.map((sectionKey) => {
                  const sectionTitle = t("label", {
                    ns: globalSectionConfigs[sectionKey].i18nNamespace,
                    defaultValue:
                      sectionKey.charAt(0).toUpperCase() +
                      sectionKey.slice(1).replace(/_/g, " "),
                  });

                  return (
                    <div
                      key={sectionKey}
                      className={cn(
                        activeSection === sectionKey ? "block" : "hidden",
                      )}
                    >
                      <GlobalConfigSection
                        sectionKey={sectionKey}
                        schema={extractSchemaSection(schema, sectionKey)}
                        config={config}
                        onSave={handleSave}
                        title={sectionTitle}
                      />
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}
