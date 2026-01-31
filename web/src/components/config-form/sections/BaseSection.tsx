// Base Section Component for config form sections
// Used as a foundation for reusable section components

import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import useSWR from "swr";
import axios from "axios";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ConfigForm } from "../ConfigForm";
import type { UiSchema } from "@rjsf/utils";
import {
  useConfigOverride,
  normalizeConfigValue,
} from "@/hooks/use-config-override";
import { useSectionSchema } from "@/hooks/use-config-schema";
import type { FrigateConfig } from "@/types/frigateConfig";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LuRotateCcw,
  LuSave,
  LuChevronDown,
  LuChevronRight,
} from "react-icons/lu";
import Heading from "@/components/ui/heading";
import get from "lodash/get";
import unset from "lodash/unset";
import cloneDeep from "lodash/cloneDeep";
import isEqual from "lodash/isEqual";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { applySchemaDefaults } from "@/lib/config-schema";
import { isJsonObject } from "@/lib/utils";
import { ConfigSectionData, JsonObject, JsonValue } from "@/types/configForm";

export interface SectionConfig {
  /** Field ordering within the section */
  fieldOrder?: string[];
  /** Fields to group together */
  fieldGroups?: Record<string, string[]>;
  /** Fields to hide from UI */
  hiddenFields?: string[];
  /** Fields to show in advanced section */
  advancedFields?: string[];
  /** Fields to compare for override detection */
  overrideFields?: string[];
  /** Whether to enable live validation */
  liveValidate?: boolean;
  /** Additional uiSchema overrides */
  uiSchema?: UiSchema;
}

export interface BaseSectionProps {
  /** Whether this is at global or camera level */
  level: "global" | "camera";
  /** Camera name (required if level is "camera") */
  cameraName?: string;
  /** Whether to show override indicator badge */
  showOverrideIndicator?: boolean;
  /** Custom section configuration */
  sectionConfig?: SectionConfig;
  /** Whether the section is disabled */
  disabled?: boolean;
  /** Whether the section is read-only */
  readonly?: boolean;
  /** Callback when settings are saved */
  onSave?: () => void;
  /** Whether a restart is required after changes */
  requiresRestart?: boolean;
  /** Whether section is collapsible */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Whether to show the section title (default: false for global, true for camera) */
  showTitle?: boolean;
}

export interface CreateSectionOptions {
  /** The config path for this section (e.g., "detect", "record") */
  sectionPath: string;
  /** i18n namespace for this section (e.g., "config/detect") */
  i18nNamespace: string;
  /** Default section configuration */
  defaultConfig: SectionConfig;
}

/**
 * Factory function to create reusable config section components
 */
export function createConfigSection({
  sectionPath,
  i18nNamespace,
  defaultConfig,
}: CreateSectionOptions) {
  const cameraUpdateTopicMap: Record<string, string> = {
    detect: "detect",
    record: "record",
    snapshots: "snapshots",
    motion: "motion",
    objects: "objects",
    review: "review",
    audio: "audio",
    notifications: "notifications",
    live: "live",
    timestamp_style: "timestamp_style",
    audio_transcription: "audio_transcription",
    birdseye: "birdseye",
    face_recognition: "face_recognition",
    ffmpeg: "ffmpeg",
    lpr: "lpr",
    semantic_search: "semantic_search",
    mqtt: "mqtt",
    onvif: "onvif",
    ui: "ui",
  };

  const ConfigSection = function ConfigSection({
    level,
    cameraName,
    showOverrideIndicator = true,
    sectionConfig = defaultConfig,
    disabled = false,
    readonly = false,
    onSave,
    requiresRestart = true,
    collapsible = false,
    defaultCollapsed = false,
    showTitle,
  }: BaseSectionProps) {
    const { t, i18n } = useTranslation([
      i18nNamespace,
      "config/cameras",
      "views/settings",
      "common",
    ]);
    const [isOpen, setIsOpen] = useState(!defaultCollapsed);
    const [pendingData, setPendingData] = useState<ConfigSectionData | null>(
      null,
    );
    const [isSaving, setIsSaving] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const isResettingRef = useRef(false);

    const updateTopic =
      level === "camera" && cameraName
        ? cameraUpdateTopicMap[sectionPath]
          ? `config/cameras/${cameraName}/${cameraUpdateTopicMap[sectionPath]}`
          : undefined
        : `config/${sectionPath}`;

    // Default: show title for camera level (since it might be collapsible), hide for global
    const shouldShowTitle = showTitle ?? level === "camera";

    // Fetch config
    const { data: config, mutate: refreshConfig } =
      useSWR<FrigateConfig>("config");

    // Get section schema using cached hook
    const sectionSchema = useSectionSchema(sectionPath, level);

    // Get override status
    const { isOverridden, globalValue, cameraValue } = useConfigOverride({
      config,
      cameraName: level === "camera" ? cameraName : undefined,
      sectionPath,
      compareFields: sectionConfig.overrideFields,
    });

    // Get current form data
    const rawFormData = useMemo(() => {
      if (!config) return {};

      if (level === "camera" && cameraName) {
        return get(config.cameras?.[cameraName], sectionPath) || {};
      }

      return get(config, sectionPath) || {};
    }, [config, level, cameraName]);

    const sanitizeSectionData = useCallback(
      (data: ConfigSectionData) => {
        const normalized = normalizeConfigValue(data) as ConfigSectionData;
        if (
          !sectionConfig.hiddenFields ||
          sectionConfig.hiddenFields.length === 0
        ) {
          return normalized;
        }

        const cleaned = cloneDeep(normalized) as ConfigSectionData;
        sectionConfig.hiddenFields.forEach((path) => {
          if (!path) return;
          unset(cleaned, path);
        });
        return cleaned;
      },
      [sectionConfig.hiddenFields],
    );

    const formData = useMemo(() => {
      const baseData = sectionSchema
        ? applySchemaDefaults(sectionSchema, rawFormData)
        : rawFormData;
      return sanitizeSectionData(baseData);
    }, [rawFormData, sectionSchema, sanitizeSectionData]);

    const schemaDefaults = useMemo(() => {
      if (!sectionSchema) {
        return {};
      }
      return applySchemaDefaults(sectionSchema, {});
    }, [sectionSchema]);

    // Clear pendingData whenever formData changes (e.g., from server refresh)
    // This prevents RJSF's initial onChange call from being treated as a user edit
    useEffect(() => {
      setPendingData(null);
    }, [formData]);

    useEffect(() => {
      if (isResettingRef.current) {
        isResettingRef.current = false;
      }
    }, [formKey]);

    const buildOverrides = useCallback(
      (
        current: unknown,
        base: unknown,
        defaults: unknown,
      ): unknown | undefined => {
        if (current === null || current === undefined || current === "") {
          return undefined;
        }

        if (Array.isArray(current)) {
          if (
            (base === undefined &&
              defaults !== undefined &&
              isEqual(current, defaults)) ||
            isEqual(current, base)
          ) {
            return undefined;
          }
          return current;
        }

        if (isJsonObject(current)) {
          const currentObj = current;
          const baseObj = isJsonObject(base) ? base : undefined;
          const defaultsObj = isJsonObject(defaults) ? defaults : undefined;

          const result: JsonObject = {};
          for (const [key, value] of Object.entries(currentObj)) {
            const overrideValue = buildOverrides(
              value,
              baseObj ? baseObj[key] : undefined,
              defaultsObj ? defaultsObj[key] : undefined,
            );
            if (overrideValue !== undefined) {
              result[key] = overrideValue as JsonValue;
            }
          }

          return Object.keys(result).length > 0 ? result : undefined;
        }

        if (
          base === undefined &&
          defaults !== undefined &&
          isEqual(current, defaults)
        ) {
          return undefined;
        }

        if (isEqual(current, base)) {
          return undefined;
        }

        return current;
      },
      [],
    );

    // Track if there are unsaved changes
    const hasChanges = useMemo(() => {
      if (!pendingData) return false;
      return !isEqual(formData, pendingData);
    }, [formData, pendingData]);

    // Handle form data change
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
        const sanitizedData = sanitizeSectionData(data as ConfigSectionData);
        if (isEqual(formData, sanitizedData)) {
          setPendingData(null);
          return;
        }
        setPendingData(sanitizedData);
      },
      [formData, sanitizeSectionData],
    );

    const handleReset = useCallback(() => {
      isResettingRef.current = true;
      setPendingData(null);
      setFormKey((prev) => prev + 1);
    }, []);

    // Handle save button click
    const handleSave = useCallback(async () => {
      if (!pendingData) return;

      setIsSaving(true);
      try {
        const basePath =
          level === "camera" && cameraName
            ? `cameras.${cameraName}.${sectionPath}`
            : sectionPath;

        const rawData = sanitizeSectionData(rawFormData);
        const overrides = buildOverrides(pendingData, rawData, schemaDefaults);

        if (!overrides || Object.keys(overrides).length === 0) {
          setPendingData(null);
          return;
        }

        // await axios.put("config/set", {
        //   requires_restart: requiresRestart ? 0 : 1,
        //   update_topic: updateTopic,
        //   config_data: {
        //     [basePath]: overrides,
        //   },
        // });

        // log save to console for debugging
        console.log("Saved config data:", {
          [basePath]: overrides,
          update_topic: updateTopic,
          requires_restart: requiresRestart ? 0 : 1,
        });

        toast.success(
          t("toast.success", {
            ns: "views/settings",
            defaultValue: "Settings saved successfully",
          }),
        );

        setPendingData(null);
        refreshConfig();
        onSave?.();
      } catch (error) {
        // Parse Pydantic validation errors from API response
        if (axios.isAxiosError(error) && error.response?.data) {
          const responseData = error.response.data;
          if (responseData.detail && Array.isArray(responseData.detail)) {
            const validationMessages = responseData.detail
              .map((err: { loc?: string[]; msg?: string }) => {
                const field = err.loc?.slice(1).join(".") || "unknown";
                return `${field}: ${err.msg || "Invalid value"}`;
              })
              .join(", ");
            toast.error(
              t("toast.validationError", {
                ns: "views/settings",
                defaultValue: `Validation failed: ${validationMessages}`,
              }),
            );
          } else if (responseData.message) {
            toast.error(responseData.message);
          } else {
            toast.error(
              t("toast.error", {
                ns: "views/settings",
                defaultValue: "Failed to save settings",
              }),
            );
          }
        } else {
          toast.error(
            t("toast.error", {
              ns: "views/settings",
              defaultValue: "Failed to save settings",
            }),
          );
        }
      } finally {
        setIsSaving(false);
      }
    }, [
      pendingData,
      level,
      cameraName,
      requiresRestart,
      t,
      refreshConfig,
      onSave,
      rawFormData,
      sanitizeSectionData,
      buildOverrides,
      schemaDefaults,
      updateTopic,
    ]);

    // Handle reset to global - removes camera-level override by deleting the section
    const handleResetToGlobal = useCallback(async () => {
      if (level !== "camera" || !cameraName) return;

      try {
        const basePath = `cameras.${cameraName}.${sectionPath}`;

        // Send empty string to delete the key from config (see update_yaml in backend)
        // await axios.put("config/set", {
        //   requires_restart: requiresRestart ? 0 : 1,
        //   update_topic: updateTopic,
        //   config_data: {
        //     [basePath]: "",
        //   },
        // });

        // log reset to console for debugging
        console.log("Reset to global config for path:", basePath, {
          update_topic: updateTopic,
          requires_restart: requiresRestart ? 0 : 1,
        });

        toast.success(
          t("toast.resetSuccess", {
            ns: "views/settings",
            defaultValue: "Reset to global defaults",
          }),
        );

        setPendingData(null);
        refreshConfig();
      } catch {
        toast.error(
          t("toast.resetError", {
            ns: "views/settings",
            defaultValue: "Failed to reset settings",
          }),
        );
      }
    }, [level, cameraName, requiresRestart, t, refreshConfig, updateTopic]);

    if (!sectionSchema) {
      return null;
    }

    // Get section title from config namespace
    const defaultTitle =
      sectionPath.charAt(0).toUpperCase() +
      sectionPath.slice(1).replace(/_/g, " ");

    // For camera-level sections, keys live under `config/cameras` and are
    // nested under the section name (e.g., `audio.label`). For global-level
    // sections, keys are nested under the section name in `config/global`.
    const configNamespace =
      level === "camera" ? "config/cameras" : "config/global";
    const title = t(`${sectionPath}.label`, {
      ns: configNamespace,
      defaultValue: defaultTitle,
    });

    const sectionDescription = i18n.exists(`${sectionPath}.description`, {
      ns: configNamespace,
    })
      ? t(`${sectionPath}.description`, { ns: configNamespace })
      : undefined;

    const sectionContent = (
      <div className="space-y-6">
        <ConfigForm
          key={formKey}
          schema={sectionSchema}
          formData={pendingData || formData}
          onChange={handleChange}
          fieldOrder={sectionConfig.fieldOrder}
          fieldGroups={sectionConfig.fieldGroups}
          hiddenFields={sectionConfig.hiddenFields}
          advancedFields={sectionConfig.advancedFields}
          liveValidate={sectionConfig.liveValidate}
          uiSchema={sectionConfig.uiSchema}
          disabled={disabled || isSaving}
          readonly={readonly}
          showSubmit={false}
          i18nNamespace={configNamespace}
          formContext={{
            level,
            cameraName,
            globalValue,
            cameraValue,
            // For widgets that need access to full camera config (e.g., zone names)
            fullCameraConfig:
              level === "camera" && cameraName
                ? config?.cameras?.[cameraName]
                : undefined,
            fullConfig: config,
            // When rendering camera-level sections, provide the section path so
            // field templates can look up keys under the `config/cameras` namespace
            // When using a consolidated global namespace, keys are nested
            // under the section name (e.g., `audio.label`) so provide the
            // section prefix to templates so they can attempt `${section}.${field}` lookups.
            sectionI18nPrefix: sectionPath,
            t,
          }}
        />

        {/* Save button */}
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
                disabled={isSaving || disabled}
                className="gap-2"
              >
                {t("reset", { ns: "common", defaultValue: "Reset" })}
              </Button>
            )}
            <Button
              onClick={handleSave}
              variant="select"
              disabled={!hasChanges || isSaving || disabled}
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

    if (collapsible) {
      return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="space-y-3">
            <CollapsibleTrigger asChild>
              <div className="flex cursor-pointer items-center justify-between">
                <div className="flex items-center gap-3">
                  {isOpen ? (
                    <LuChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <LuChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Heading as="h4">{title}</Heading>
                  {showOverrideIndicator &&
                    level === "camera" &&
                    isOverridden && (
                      <Badge variant="secondary" className="text-xs">
                        {t("overridden", {
                          ns: "common",
                          defaultValue: "Overridden",
                        })}
                      </Badge>
                    )}
                  {hasChanges && (
                    <Badge variant="outline" className="text-xs">
                      {t("modified", {
                        ns: "common",
                        defaultValue: "Modified",
                      })}
                    </Badge>
                  )}
                </div>
                {level === "camera" && isOverridden && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetToGlobal();
                    }}
                    className="gap-2"
                  >
                    <LuRotateCcw className="h-4 w-4" />
                    {t("button.resetToGlobal", {
                      ns: "common",
                      defaultValue: "Reset to Global",
                    })}
                  </Button>
                )}
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="pl-7">{sectionContent}</div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      );
    }

    return (
      <div className="space-y-3">
        {shouldShowTitle && (
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <Heading as="h4">{title}</Heading>
                {showOverrideIndicator &&
                  level === "camera" &&
                  isOverridden && (
                    <Badge variant="secondary" className="text-xs">
                      {t("overridden", {
                        ns: "common",
                        defaultValue: "Overridden",
                      })}
                    </Badge>
                  )}
                {hasChanges && (
                  <Badge variant="outline" className="text-xs">
                    {t("modified", { ns: "common", defaultValue: "Modified" })}
                  </Badge>
                )}
              </div>
              {sectionDescription && (
                <p className="text-sm text-muted-foreground">
                  {sectionDescription}
                </p>
              )}
            </div>
            {level === "camera" && isOverridden && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetToGlobal}
                className="gap-2"
              >
                <LuRotateCcw className="h-4 w-4" />
                {t("button.resetToGlobal", {
                  ns: "common",
                  defaultValue: "Reset to Global",
                })}
              </Button>
            )}
          </div>
        )}

        {/* Reset button when title is hidden but we're at camera level with override */}
        {!shouldShowTitle && level === "camera" && isOverridden && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetToGlobal}
              className="gap-2"
            >
              <LuRotateCcw className="h-4 w-4" />
              {t("button.resetToGlobal", {
                ns: "common",
                defaultValue: "Reset to Global",
              })}
            </Button>
          </div>
        )}

        {sectionContent}
      </div>
    );
  };

  return ConfigSection;
}
