// Base Section Component for config form sections
// Used as a foundation for reusable section components

import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import useSWR from "swr";
import axios from "axios";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import sectionRenderers, {
  RendererComponent,
} from "@/components/config-form/sectionExtras/registry";
import { ConfigForm } from "../ConfigForm";
import type { FormValidation, UiSchema } from "@rjsf/utils";
import { getSectionValidation } from "../section-validations";
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
  /** Documentation link for the section */
  sectionDocs?: string;
  /** Per-field documentation links */
  fieldDocs?: Record<string, string>;
  /** Fields that require restart when modified (empty means all fields) */
  restartRequired?: string[];
  /** Whether to enable live validation */
  liveValidate?: boolean;
  /** Additional uiSchema overrides */
  uiSchema?: UiSchema;
  /** Optional per-section renderers usable by FieldTemplate `ui:before`/`ui:after` */
  renderers?: Record<string, RendererComponent>;
  /** Optional custom validation for section data */
  customValidate?: (
    formData: unknown,
    errors: FormValidation,
  ) => FormValidation;
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
  /** Callback when section status changes */
  onStatusChange?: (status: {
    hasChanges: boolean;
    isOverridden: boolean;
  }) => void;
  /** Pending form data keyed by "sectionKey" or "cameraName::sectionKey" */
  pendingDataBySection?: Record<string, unknown>;
  /** Callback to update pending data for a section */
  onPendingDataChange?: (
    sectionKey: string,
    cameraName: string | undefined,
    data: ConfigSectionData | null,
  ) => void;
}

export interface CreateSectionOptions {
  /** The config path for this section (e.g., "detect", "record") */
  sectionPath: string;
  /** Default section configuration */
  defaultConfig: SectionConfig;
}

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

export type ConfigSectionProps = BaseSectionProps & CreateSectionOptions;

export function ConfigSection({
  sectionPath,
  defaultConfig,
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
  onStatusChange,
  pendingDataBySection,
  onPendingDataChange,
}: ConfigSectionProps) {
  const { t, i18n } = useTranslation([
    level === "camera" ? "config/cameras" : "config/global",
    "config/cameras",
    "views/settings",
    "common",
  ]);
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);

  // Create a key for this section's pending data
  const pendingDataKey = useMemo(
    () =>
      level === "camera" && cameraName
        ? `${cameraName}::${sectionPath}`
        : sectionPath,
    [level, cameraName, sectionPath],
  );

  // Use pending data from parent if available, otherwise use local state
  const [localPendingData, setLocalPendingData] =
    useState<ConfigSectionData | null>(null);

  const pendingData =
    pendingDataBySection !== undefined
      ? (pendingDataBySection[pendingDataKey] as ConfigSectionData | null)
      : localPendingData;

  const setPendingData = useCallback(
    (data: ConfigSectionData | null) => {
      if (onPendingDataChange) {
        onPendingDataChange(sectionPath, cameraName, data);
      } else {
        setLocalPendingData(data);
      }
    },
    [onPendingDataChange, sectionPath, cameraName],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const isResettingRef = useRef(false);
  const isInitializingRef = useRef(true);

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
  }, [config, level, cameraName, sectionPath]);

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
  // Only clear if pendingData is managed locally (not by parent)
  useEffect(() => {
    if (!pendingData) {
      isInitializingRef.current = true;
    }
    if (onPendingDataChange === undefined) {
      setPendingData(null);
    }
  }, [formData, pendingData, setPendingData, onPendingDataChange]);

  useEffect(() => {
    if (isResettingRef.current) {
      isResettingRef.current = false;
    }
  }, [formKey]);

  // Build a minimal overrides payload by comparing `current` against `base`
  // (existing config) and `defaults` (schema defaults).
  // - Returns `undefined` for null/empty values or when `current` equals `base`
  //   (or equals `defaults` when `base` is undefined).
  // - For objects, recurses and returns an object containing only keys that
  //   are overridden; returns `undefined` if no keys are overridden.
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

  useEffect(() => {
    onStatusChange?.({ hasChanges, isOverridden });
  }, [hasChanges, isOverridden, onStatusChange]);

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
      const rawData = sanitizeSectionData(rawFormData as ConfigSectionData);
      const overrides = buildOverrides(sanitizedData, rawData, schemaDefaults);
      if (isInitializingRef.current && !pendingData) {
        isInitializingRef.current = false;
        if (overrides === undefined) {
          setPendingData(null);
          return;
        }
      }
      if (overrides === undefined) {
        setPendingData(null);
        return;
      }
      setPendingData(sanitizedData);
    },
    [
      pendingData,
      rawFormData,
      sanitizeSectionData,
      buildOverrides,
      schemaDefaults,
      setPendingData,
    ],
  );

  const requiresRestartForOverrides = useCallback(
    (overrides: unknown) => {
      if (sectionConfig.restartRequired === undefined) {
        return requiresRestart;
      }

      if (sectionConfig.restartRequired.length === 0) {
        return true;
      }

      if (!overrides || typeof overrides !== "object") {
        return false;
      }

      return sectionConfig.restartRequired.some(
        (path) => get(overrides as JsonObject, path) !== undefined,
      );
    },
    [requiresRestart, sectionConfig.restartRequired],
  );

  const handleReset = useCallback(() => {
    isResettingRef.current = true;
    setPendingData(null);
    setFormKey((prev) => prev + 1);
  }, [setPendingData]);

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

      const needsRestart = requiresRestartForOverrides(overrides);

      await axios.put("config/sett", {
        requires_restart: needsRestart ? 1 : 0,
        update_topic: updateTopic,
        config_data: {
          [basePath]: overrides,
        },
      });
      // log save to console for debugging
      // eslint-disable-next-line no-console
      console.log("Saved config data:", {
        [basePath]: overrides,
        update_topic: updateTopic,
        requires_restart: needsRestart ? 1 : 0,
      });

      toast.success(
        t(needsRestart ? "toast.successRestartRequired" : "toast.success", {
          ns: "views/settings",
          defaultValue: needsRestart
            ? "Settings saved successfully. Restart Frigate to apply your changes."
            : "Settings saved successfully",
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
    sectionPath,
    pendingData,
    level,
    cameraName,
    t,
    refreshConfig,
    onSave,
    rawFormData,
    sanitizeSectionData,
    buildOverrides,
    schemaDefaults,
    updateTopic,
    setPendingData,
    requiresRestartForOverrides,
  ]);

  // Handle reset to global/defaults - removes camera-level override or resets global to defaults
  const handleResetToGlobal = useCallback(async () => {
    if (level === "camera" && !cameraName) return;

    try {
      const basePath =
        level === "camera" && cameraName
          ? `cameras.${cameraName}.${sectionPath}`
          : sectionPath;

      const configData = level === "global" ? schemaDefaults : "";

      await axios.put("config/sett", {
        requires_restart: requiresRestart ? 0 : 1,
        update_topic: updateTopic,
        config_data: {
          [basePath]: configData,
        },
      });

      // log reset to console for debugging
      // eslint-disable-next-line no-console
      console.log(
        level === "global"
          ? "Reset to defaults for path:"
          : "Reset to global config for path:",
        basePath,
        {
          update_topic: updateTopic,
          requires_restart: requiresRestart ? 0 : 1,
        },
      );
      toast.success(
        t("toast.resetSuccess", {
          ns: "views/settings",
          defaultValue:
            level === "global"
              ? "Reset to defaults"
              : "Reset to global defaults",
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
  }, [
    schemaDefaults,
    sectionPath,
    level,
    cameraName,
    requiresRestart,
    t,
    refreshConfig,
    updateTopic,
    setPendingData,
  ]);

  const sectionValidation = useMemo(
    () => getSectionValidation({ sectionPath, level, t }),
    [sectionPath, level, t],
  );

  const customValidate = useMemo(() => {
    const validators: Array<
      (formData: unknown, errors: FormValidation) => FormValidation
    > = [];

    if (sectionConfig.customValidate) {
      validators.push(sectionConfig.customValidate);
    }

    if (sectionValidation) {
      validators.push(sectionValidation);
    }

    if (validators.length === 0) {
      return undefined;
    }

    return (formData: unknown, errors: FormValidation) =>
      validators.reduce(
        (currentErrors, validatorFn) => validatorFn(formData, currentErrors),
        errors,
      );
  }, [sectionConfig.customValidate, sectionValidation]);

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
        customValidate={customValidate}
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
          renderers:
            sectionConfig?.renderers ?? sectionRenderers?.[sectionPath],
          sectionDocs: sectionConfig.sectionDocs,
          fieldDocs: sectionConfig.fieldDocs,
        }}
      />

      {/* Save button */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-danger">
              {t("unsavedChanges", {
                ns: "views/settings",
                defaultValue: "You have unsaved changes",
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {((level === "camera" && isOverridden) || level === "global") &&
            !hasChanges && (
              <Button
                onClick={() => setIsResetDialogOpen(true)}
                variant="outline"
                disabled={isSaving || disabled}
                className="gap-2"
              >
                <LuRotateCcw className="h-4 w-4" />
                {level === "global"
                  ? t("button.resetToDefault", {
                      ns: "common",
                      defaultValue: "Reset to Default",
                    })
                  : t("button.resetToGlobal", {
                      ns: "common",
                      defaultValue: "Reset to Global",
                    })}
              </Button>
            )}
          {hasChanges && (
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={isSaving || disabled}
              className="gap-2"
            >
              {t("undo", { ns: "common", defaultValue: "Undo" })}
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

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("confirmReset", { ns: "views/settings" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {level === "global"
                ? t("resetToDefaultDescription", { ns: "views/settings" })
                : t("resetToGlobalDescription", { ns: "views/settings" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("cancel", { ns: "common" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-selected text-white hover:bg-selected/90"
              onClick={async () => {
                await handleResetToGlobal();
                setIsResetDialogOpen(false);
              }}
            >
              {level === "global"
                ? t("button.resetToDefault", { ns: "common" })
                : t("button.resetToGlobal", { ns: "common" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
              {showOverrideIndicator && level === "camera" && isOverridden && (
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
        </div>
      )}

      {sectionContent}
    </div>
  );
}
