// Global Configuration View
// Main view for configuring global Frigate settings

import { useMemo, useCallback, useState } from "react";
import useSWR from "swr";
import axios from "axios";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ConfigForm } from "@/components/config-form/ConfigForm";
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
import type { RJSFSchema } from "@rjsf/utils";
import type { FrigateConfig } from "@/types/frigateConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { extractSchemaSection } from "@/lib/config-schema";
import ActivityIndicator from "@/components/indicators/activity-indicator";

// Section configurations for global-only settings
const globalSectionConfigs: Record<
  string,
  { fieldOrder?: string[]; hiddenFields?: string[]; advancedFields?: string[] }
> = {
  mqtt: {
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
    fieldOrder: ["path"],
    advancedFields: [],
  },
  auth: {
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
    fieldOrder: ["enabled", "cert", "key"],
    advancedFields: [],
  },
  telemetry: {
    fieldOrder: ["network_interfaces", "stats", "version_check"],
    advancedFields: ["stats"],
  },
  birdseye: {
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
    fieldOrder: ["enabled", "reindex", "model_size"],
    advancedFields: ["reindex"],
  },
  face_recognition: {
    fieldOrder: ["enabled", "threshold", "min_area", "model_size"],
    advancedFields: ["threshold", "min_area"],
  },
  lpr: {
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

interface GlobalConfigSectionProps {
  sectionKey: string;
  schema: RJSFSchema | null;
  config: FrigateConfig | undefined;
  onSave: () => void;
}

function GlobalConfigSection({
  sectionKey,
  schema,
  config,
  onSave,
}: GlobalConfigSectionProps) {
  const { t } = useTranslation(["views/settings"]);

  const formData = useMemo((): Record<string, unknown> => {
    if (!config) return {} as Record<string, unknown>;
    const value = (config as unknown as Record<string, unknown>)[sectionKey];
    return (
      (value as Record<string, unknown>) || ({} as Record<string, unknown>)
    );
  }, [config, sectionKey]);

  const handleSubmit = useCallback(
    async (data: Record<string, unknown>) => {
      try {
        await axios.put("config/set", {
          requires_restart: 1,
          config_data: {
            [sectionKey]: data,
          },
        });

        toast.success(
          t(`configForm.${sectionKey}.toast.success`, {
            defaultValue: "Settings saved successfully",
          }),
        );

        onSave();
      } catch (error) {
        toast.error(
          t(`configForm.${sectionKey}.toast.error`, {
            defaultValue: "Failed to save settings",
          }),
        );
      }
    },
    [sectionKey, t, onSave],
  );

  if (!schema) {
    return null;
  }

  const sectionConfig = globalSectionConfigs[sectionKey] || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {t(`configForm.${sectionKey}.title`, {
            defaultValue:
              sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1),
          })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ConfigForm
          schema={schema}
          formData={formData}
          onSubmit={handleSubmit}
          fieldOrder={sectionConfig.fieldOrder}
          hiddenFields={sectionConfig.hiddenFields}
          advancedFields={sectionConfig.advancedFields}
        />
      </CardContent>
    </Card>
  );
}

export default function GlobalConfigView() {
  const { t } = useTranslation(["views/settings"]);
  const [activeTab, setActiveTab] = useState("shared");

  const { data: config, mutate: refreshConfig } =
    useSWR<FrigateConfig>("config");
  const { data: schema } = useSWR<RJSFSchema>("config/schema.json");

  const handleSave = useCallback(() => {
    refreshConfig();
  }, [refreshConfig]);

  if (!config || !schema) {
    return (
      <div className="flex h-full items-center justify-center">
        <ActivityIndicator />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {t("configForm.global.title", {
            defaultValue: "Global Configuration",
          })}
        </h2>
        <p className="text-muted-foreground">
          {t("configForm.global.description", {
            defaultValue:
              "Configure global settings that apply to all cameras by default.",
          })}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

        <ScrollArea className="h-[calc(100vh-300px)]">
          <TabsContent value="shared" className="space-y-6 p-1">
            {/* Shared config sections - these can be overridden per camera */}
            <DetectSection level="global" onSave={handleSave} />
            <RecordSection level="global" onSave={handleSave} />
            <SnapshotsSection level="global" onSave={handleSave} />
            <MotionSection level="global" onSave={handleSave} />
            <ObjectsSection level="global" onSave={handleSave} />
            <ReviewSection level="global" onSave={handleSave} />
            <AudioSection level="global" onSave={handleSave} />
            <NotificationsSection level="global" onSave={handleSave} />
            <LiveSection level="global" onSave={handleSave} />
            <TimestampSection level="global" onSave={handleSave} />
          </TabsContent>

          <TabsContent value="system" className="space-y-6 p-1">
            {/* System configuration sections */}
            <GlobalConfigSection
              sectionKey="database"
              schema={extractSchemaSection(schema, "database")}
              config={config}
              onSave={handleSave}
            />
            <GlobalConfigSection
              sectionKey="tls"
              schema={extractSchemaSection(schema, "tls")}
              config={config}
              onSave={handleSave}
            />
            <GlobalConfigSection
              sectionKey="auth"
              schema={extractSchemaSection(schema, "auth")}
              config={config}
              onSave={handleSave}
            />
            <GlobalConfigSection
              sectionKey="telemetry"
              schema={extractSchemaSection(schema, "telemetry")}
              config={config}
              onSave={handleSave}
            />
            <GlobalConfigSection
              sectionKey="birdseye"
              schema={extractSchemaSection(schema, "birdseye")}
              config={config}
              onSave={handleSave}
            />
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6 p-1">
            {/* Integration configuration sections */}
            <GlobalConfigSection
              sectionKey="mqtt"
              schema={extractSchemaSection(schema, "mqtt")}
              config={config}
              onSave={handleSave}
            />
            <GlobalConfigSection
              sectionKey="semantic_search"
              schema={extractSchemaSection(schema, "semantic_search")}
              config={config}
              onSave={handleSave}
            />
            <GlobalConfigSection
              sectionKey="face_recognition"
              schema={extractSchemaSection(schema, "face_recognition")}
              config={config}
              onSave={handleSave}
            />
            <GlobalConfigSection
              sectionKey="lpr"
              schema={extractSchemaSection(schema, "lpr")}
              config={config}
              onSave={handleSave}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
