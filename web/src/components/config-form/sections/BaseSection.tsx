// Base Section Component for config form sections
// Used as a foundation for reusable section components

import {
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
  useContext,
} from "react";
import useSWR from "swr";
import axios from "axios";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import sectionRenderers, {
  RendererComponent,
} from "@/components/config-form/sectionExtras/registry";
import { ConfigForm } from "../ConfigForm";
import type { FormValidation, UiSchema } from "@rjsf/utils";
import {
  modifySchemaForSection,
  getEffectiveDefaultsForSection,
  sanitizeOverridesForSection,
} from "./section-special-cases";
import { getSectionValidation } from "../section-validations";
import { useConfigOverride } from "@/hooks/use-config-override";
import { useSectionSchema } from "@/hooks/use-config-schema";
import type { FrigateConfig } from "@/types/frigateConfig";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import Heading from "@/components/ui/heading";
import get from "lodash/get";
import cloneDeep from "lodash/cloneDeep";
import isEqual from "lodash/isEqual";
import merge from "lodash/merge";
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
import { cn } from "@/lib/utils";
import { ConfigSectionData, JsonValue } from "@/types/configForm";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { StatusBarMessagesContext } from "@/context/statusbar-provider";
import {
  cameraUpdateTopicMap,
  globalCameraDefaultSections,
  buildOverrides,
  buildConfigDataForPath,
  getBaseCameraSectionValue,
  sanitizeSectionData as sharedSanitizeSectionData,
  requiresRestartForOverrides as sharedRequiresRestartForOverrides,
} from "@/utils/configUtil";
import RestartDialog from "@/components/overlay/dialog/RestartDialog";
import { useRestart } from "@/api/ws";
import type {
  ConditionalMessage,
  FieldConditionalMessage,
  MessageConditionContext,
} from "../section-configs/types";
import { useConfigMessages } from "@/hooks/use-config-messages";
import { ConfigMessageBanner } from "../ConfigMessageBanner";

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
  /** Fields that require restart when modified (empty means none; undefined uses default) */
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
  /** Conditional messages displayed as banners above the section form */
  messages?: ConditionalMessage[];
  /** Conditional messages displayed inline with specific fields */
  fieldMessages?: FieldConditionalMessage[];
}

export interface BaseSectionProps {
  /** Whether this is at global, camera, or replay level */
  level: "global" | "camera" | "replay";
  /** Camera name (required if level is "camera" or "replay") */
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
  /** If true, apply config in-memory only without writing to YAML */
  skipSave?: boolean;
  /** If true, buttons are not sticky at the bottom */
  noStickyButtons?: boolean;
  /** Callback when section status changes */
  onStatusChange?: (status: {
    hasChanges: boolean;
    isOverridden: boolean;
    overrideSource?: "global" | "profile";
    hasValidationErrors: boolean;
  }) => void;
  /** Pending form data keyed by "sectionKey" or "cameraName::sectionKey" */
  pendingDataBySection?: Record<string, ConfigSectionData>;
  /** Callback to update pending data for a section */
  onPendingDataChange?: (
    sectionKey: string,
    cameraName: string | undefined,
    data: ConfigSectionData | null,
  ) => void;
  /** When set, editing this profile's overrides instead of the base config */
  profileName?: string;
  /** Display name for the profile (friendly name) */
  profileFriendlyName?: string;
  /** Border color class for profile override badge (e.g., "border-amber-500") */
  profileBorderColor?: string;
  /** Callback to delete the current profile's overrides for this section */
  onDeleteProfileSection?: () => void;
  /** Whether a SaveAll operation is in progress (disables individual Save) */
  isSavingAll?: boolean;
  /** Callback when this section's saving state changes */
  onSavingChange?: (isSaving: boolean) => void;
}

export interface CreateSectionOptions {
  /** The config path for this section (e.g., "detect", "record") */
  sectionPath: string;
  /** Default section configuration */
  defaultConfig: SectionConfig;
}

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
  defaultCollapsed = true,
  showTitle,
  skipSave = false,
  noStickyButtons = false,
  onStatusChange,
  pendingDataBySection,
  onPendingDataChange,
  profileName,
  profileFriendlyName,
  profileBorderColor,
  onDeleteProfileSection,
  isSavingAll = false,
  onSavingChange,
}: ConfigSectionProps) {
  // For replay level, treat as camera-level config access
  const effectiveLevel = level === "replay" ? "camera" : level;
  const { t, i18n } = useTranslation([
    effectiveLevel === "camera" ? "config/cameras" : "config/global",
    "config/cameras",
    "views/settings",
    "common",
    "components/dialog",
  ]);
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);
  const { send: sendRestart } = useRestart();
  const statusBar = useContext(StatusBarMessagesContext);

  // Create a key for this section's pending data
  // When editing a profile, use "cameraName::profiles.profileName.sectionPath"
  const effectiveSectionPath = profileName
    ? `profiles.${profileName}.${sectionPath}`
    : sectionPath;

  const pendingDataKey = useMemo(
    () =>
      effectiveLevel === "camera" && cameraName
        ? `${cameraName}::${effectiveSectionPath}`
        : effectiveSectionPath,
    [effectiveLevel, cameraName, effectiveSectionPath],
  );

  // Use pending data from parent if available, otherwise use local state
  const [localPendingData, setLocalPendingData] =
    useState<ConfigSectionData | null>(null);
  const [pendingOverrides, setPendingOverrides] = useState<
    JsonValue | undefined
  >(undefined);
  const [dirtyOverrides, setDirtyOverrides] = useState<JsonValue | undefined>(
    undefined,
  );
  const baselineByKeyRef = useRef<Record<string, ConfigSectionData>>({});

  const pendingData =
    pendingDataBySection !== undefined
      ? (pendingDataBySection[pendingDataKey] as ConfigSectionData | null)
      : localPendingData;
  const pendingDataRef = useRef<ConfigSectionData | null>(null);

  useEffect(() => {
    pendingDataRef.current = pendingData;
  }, [pendingData]);

  const setPendingData = useCallback(
    (data: ConfigSectionData | null) => {
      if (onPendingDataChange) {
        onPendingDataChange(effectiveSectionPath, cameraName, data);
      } else {
        setLocalPendingData(data);
      }
    },
    [onPendingDataChange, effectiveSectionPath, cameraName],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingToDefault, setIsResettingToDefault] = useState(false);
  const [hasValidationErrors, setHasValidationErrors] = useState(false);
  const [extraHasChanges, setExtraHasChanges] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isDeleteProfileDialogOpen, setIsDeleteProfileDialogOpen] =
    useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const isResettingRef = useRef(false);
  const isInitializingRef = useRef(true);
  const lastPendingDataKeyRef = useRef<string | null>(null);

  // Profile definitions don't hot-reload — only PUT /api/profile/set applies them
  const updateTopic = profileName
    ? undefined
    : effectiveLevel === "camera" && cameraName
      ? cameraUpdateTopicMap[sectionPath]
        ? `config/cameras/${cameraName}/${cameraUpdateTopicMap[sectionPath]}`
        : undefined
      : globalCameraDefaultSections.has(sectionPath) &&
          cameraUpdateTopicMap[sectionPath]
        ? `config/cameras/*/${cameraUpdateTopicMap[sectionPath]}`
        : `config/${sectionPath}`;
  // Default: show title for camera level (since it might be collapsible), hide for global
  const shouldShowTitle = showTitle ?? effectiveLevel === "camera";

  // Fetch config
  const { data: config, mutate: refreshConfig } =
    useSWR<FrigateConfig>("config");

  // Get section schema using cached hook
  const sectionSchema = useSectionSchema(sectionPath, effectiveLevel);

  // Apply special case handling for sections with problematic schema defaults
  const modifiedSchema = useMemo(
    () =>
      modifySchemaForSection(sectionPath, level, sectionSchema ?? undefined),
    [sectionPath, level, sectionSchema],
  );

  // Get override status (camera vs global)
  const { isOverridden, globalValue, cameraValue } = useConfigOverride({
    config,
    cameraName: effectiveLevel === "camera" ? cameraName : undefined,
    sectionPath,
    compareFields: sectionConfig.overrideFields,
  });

  // Check if the active profile overrides the base config for this section
  const profileOverridesSection = useMemo(() => {
    if (!profileName || !cameraName || !config) return false;
    const profileData = config.cameras?.[cameraName]?.profiles?.[profileName];
    return !!profileData?.[sectionPath as keyof typeof profileData];
  }, [profileName, cameraName, config, sectionPath]);

  const overrideSource: "global" | "profile" | undefined =
    profileOverridesSection ? "profile" : isOverridden ? "global" : undefined;

  // Get current form data
  // When a profile is active the top-level camera sections contain the
  // effective (profile-merged) values.  For the base-config view we read
  // from `base_config` (original values before the profile was applied).
  // When editing a profile, we merge the base value with profile overrides.
  const rawSectionValue = useMemo(() => {
    if (!config) return undefined;

    if (effectiveLevel === "camera" && cameraName) {
      // Base value: prefer base_config (pre-profile) over effective value
      const baseValue = getBaseCameraSectionValue(
        config,
        cameraName,
        sectionPath,
      );
      if (profileName) {
        const profileOverrides = get(
          config.cameras?.[cameraName],
          `profiles.${profileName}.${sectionPath}`,
        );
        if (profileOverrides && typeof profileOverrides === "object") {
          return merge(cloneDeep(baseValue ?? {}), cloneDeep(profileOverrides));
        }
        return baseValue;
      }
      return baseValue;
    }

    return get(config, sectionPath);
  }, [config, cameraName, sectionPath, effectiveLevel, profileName]);

  const rawFormData = useMemo(() => {
    if (!config) return {};

    if (rawSectionValue === undefined || rawSectionValue === null) {
      return {};
    }

    return rawSectionValue;
  }, [config, rawSectionValue]);

  // When editing a profile, hide fields that require a restart since they
  // cannot take effect via profile switching alone.
  const effectiveHiddenFields = useMemo(() => {
    if (!profileName || !sectionConfig.restartRequired?.length) {
      return sectionConfig.hiddenFields;
    }
    const base = sectionConfig.hiddenFields ?? [];
    return [...new Set([...base, ...sectionConfig.restartRequired])];
  }, [profileName, sectionConfig.hiddenFields, sectionConfig.restartRequired]);

  const sanitizeSectionData = useCallback(
    (data: ConfigSectionData) =>
      sharedSanitizeSectionData(data, effectiveHiddenFields),
    [effectiveHiddenFields],
  );

  const formData = useMemo(() => {
    const baseData = modifiedSchema
      ? applySchemaDefaults(modifiedSchema, rawFormData)
      : rawFormData;
    return sanitizeSectionData(baseData);
  }, [rawFormData, modifiedSchema, sanitizeSectionData]);

  const baselineSnapshot = useMemo(() => {
    if (!pendingData) {
      const snapshot = cloneDeep(formData as ConfigSectionData);
      baselineByKeyRef.current[pendingDataKey] = snapshot;
      return snapshot;
    }

    const cached = baselineByKeyRef.current[pendingDataKey];
    if (cached) {
      return cached;
    }

    const snapshot = cloneDeep(formData as ConfigSectionData);
    baselineByKeyRef.current[pendingDataKey] = snapshot;
    return snapshot;
  }, [formData, pendingData, pendingDataKey]);

  const schemaDefaults = useMemo(() => {
    if (!modifiedSchema) {
      return {};
    }
    return applySchemaDefaults(modifiedSchema, {});
  }, [modifiedSchema]);

  // Get effective defaults, handling special cases where schema defaults
  // don't match semantic intent
  const effectiveSchemaDefaults = useMemo(
    () =>
      getEffectiveDefaultsForSection(
        sectionPath,
        level,
        modifiedSchema,
        schemaDefaults,
      ),
    [level, schemaDefaults, sectionPath, modifiedSchema],
  );

  const compareBaseData = useMemo(
    () => sanitizeSectionData(rawFormData as ConfigSectionData),
    [rawFormData, sanitizeSectionData],
  );

  // Clear pendingData whenever the section/camera key changes (e.g., switching
  // cameras) or when there is no pending data yet (initialization).
  // This prevents RJSF's initial onChange call from being treated as a user edit.
  // Only clear if pendingData is managed locally (not by parent).
  useEffect(() => {
    const pendingKeyChanged = lastPendingDataKeyRef.current !== pendingDataKey;

    if (pendingKeyChanged) {
      lastPendingDataKeyRef.current = pendingDataKey;
      isInitializingRef.current = true;
      setPendingOverrides(undefined);
      setDirtyOverrides(undefined);

      // Reset local pending data when switching sections/cameras
      if (onPendingDataChange === undefined) {
        setPendingData(null);
      }
    } else if (!pendingData) {
      isInitializingRef.current = true;
      setPendingOverrides(undefined);
      setDirtyOverrides(undefined);
    }
  }, [
    onPendingDataChange,
    pendingData,
    pendingDataKey,
    setPendingData,
    setDirtyOverrides,
    setPendingOverrides,
  ]);

  useEffect(() => {
    if (isResettingRef.current) {
      isResettingRef.current = false;
    }
  }, [formKey]);

  // Track if there are unsaved changes
  const hasChanges = useMemo(() => {
    const pendingChanged = pendingData
      ? !isEqual(formData, pendingData)
      : false;
    return pendingChanged || extraHasChanges;
  }, [formData, pendingData, extraHasChanges]);

  useEffect(() => {
    onStatusChange?.({
      hasChanges,
      isOverridden: profileOverridesSection || isOverridden,
      overrideSource,
      hasValidationErrors,
    });
  }, [
    hasChanges,
    isOverridden,
    profileOverridesSection,
    overrideSource,
    hasValidationErrors,
    onStatusChange,
  ]);

  // Handle form data change
  const handleChange = useCallback(
    (data: unknown) => {
      if (isResettingRef.current) {
        setPendingData(null);
        setPendingOverrides(undefined);
        return;
      }
      if (!data || typeof data !== "object") {
        setPendingData(null);
        setPendingOverrides(undefined);
        return;
      }
      const sanitizedData = sanitizeSectionData(data as ConfigSectionData);
      const nextBaselineFormData = baselineSnapshot;
      const overrides = buildOverrides(
        sanitizedData,
        compareBaseData,
        effectiveSchemaDefaults,
      );
      setPendingOverrides(overrides as JsonValue | undefined);
      if (isInitializingRef.current && !pendingData) {
        isInitializingRef.current = false;
        if (overrides === undefined) {
          setPendingData(null);
          setPendingOverrides(undefined);
          setDirtyOverrides(undefined);
          return;
        }
      }
      const dirty = buildOverrides(
        sanitizedData,
        nextBaselineFormData,
        undefined,
      );
      setDirtyOverrides(dirty as JsonValue | undefined);
      if (overrides === undefined) {
        setPendingData(null);
        setPendingOverrides(undefined);
        setDirtyOverrides(undefined);
        return;
      }
      setPendingData(sanitizedData);
    },
    [
      pendingData,
      compareBaseData,
      sanitizeSectionData,
      effectiveSchemaDefaults,
      setPendingData,
      setPendingOverrides,
      setDirtyOverrides,
      baselineSnapshot,
    ],
  );

  const currentFormData = pendingData || formData;
  const effectiveBaselineFormData = baselineSnapshot;

  // Build context for conditional messages
  const messageContext = useMemo<MessageConditionContext | undefined>(() => {
    if (!config || !currentFormData) return undefined;
    return {
      fullConfig: config,
      fullCameraConfig:
        effectiveLevel === "camera" && cameraName
          ? config.cameras?.[cameraName]
          : undefined,
      level: effectiveLevel,
      cameraName,
      formData: currentFormData as ConfigSectionData,
    };
  }, [config, currentFormData, effectiveLevel, cameraName]);

  const { activeMessages, activeFieldMessages } = useConfigMessages(
    sectionConfig.messages,
    sectionConfig.fieldMessages,
    messageContext,
  );

  // Merge field-level conditional messages into uiSchema
  const effectiveUiSchema = useMemo(() => {
    if (activeFieldMessages.length === 0) return sectionConfig.uiSchema;
    const merged = { ...(sectionConfig.uiSchema ?? {}) };
    for (const msg of activeFieldMessages) {
      const segments = msg.field.split(".");
      // Navigate to the nested uiSchema node, shallow-cloning along the way
      let node = merged;
      for (let i = 0; i < segments.length - 1; i++) {
        const seg = segments[i];
        node[seg] = { ...(node[seg] as Record<string, unknown>) };
        node = node[seg] as Record<string, unknown>;
      }
      const leafKey = segments[segments.length - 1];
      const existing = node[leafKey] as Record<string, unknown> | undefined;
      const existingMessages = ((existing?.["ui:messages"] as unknown[]) ??
        []) as Array<{
        key: string;
        messageKey: string;
        severity: string;
        position?: string;
      }>;
      node[leafKey] = {
        ...existing,
        "ui:messages": [
          ...existingMessages,
          {
            key: msg.key,
            messageKey: msg.messageKey,
            severity: msg.severity,
            position: msg.position ?? "before",
          },
        ],
      };
    }
    return merged;
  }, [sectionConfig.uiSchema, activeFieldMessages]);

  const currentOverrides = useMemo(() => {
    if (!currentFormData || typeof currentFormData !== "object") {
      return undefined;
    }
    const sanitizedData = sanitizeSectionData(
      currentFormData as ConfigSectionData,
    );
    return buildOverrides(
      sanitizedData,
      compareBaseData,
      effectiveSchemaDefaults,
    );
  }, [
    currentFormData,
    sanitizeSectionData,
    compareBaseData,
    effectiveSchemaDefaults,
  ]);

  const effectiveOverrides = pendingData
    ? (pendingOverrides ?? currentOverrides)
    : undefined;
  const uiOverrides = dirtyOverrides ?? effectiveOverrides;

  const requiresRestartForOverrides = useCallback(
    (overrides: unknown) =>
      sharedRequiresRestartForOverrides(
        overrides,
        sectionConfig.restartRequired,
        requiresRestart,
      ),
    [requiresRestart, sectionConfig.restartRequired],
  );

  const handleReset = useCallback(() => {
    isResettingRef.current = true;
    setPendingData(null);
    setPendingOverrides(undefined);
    setDirtyOverrides(undefined);
    setExtraHasChanges(false);
    setFormKey((prev) => prev + 1);
  }, [setPendingData, setPendingOverrides, setDirtyOverrides]);

  // Handle save button click
  const handleSave = useCallback(async () => {
    if (!pendingData) return;

    setIsSaving(true);
    onSavingChange?.(true);
    try {
      const basePath =
        effectiveLevel === "camera" && cameraName
          ? `cameras.${cameraName}.${effectiveSectionPath}`
          : effectiveSectionPath;
      const rawData = sanitizeSectionData(rawFormData);
      const overrides = buildOverrides(
        pendingData,
        rawData,
        effectiveSchemaDefaults,
      );
      const sanitizedOverrides = sanitizeOverridesForSection(
        sectionPath,
        effectiveLevel,
        overrides,
      );

      if (
        !sanitizedOverrides ||
        typeof sanitizedOverrides !== "object" ||
        Object.keys(sanitizedOverrides).length === 0
      ) {
        setPendingData(null);
        return;
      }

      // Profile definition edits never require restart
      const needsRestart =
        skipSave || profileName
          ? false
          : requiresRestartForOverrides(sanitizedOverrides);

      const configData = buildConfigDataForPath(basePath, sanitizedOverrides);
      await axios.put("config/set", {
        requires_restart: needsRestart ? 1 : 0,
        update_topic: updateTopic,
        config_data: configData,
        ...(skipSave ? { skip_save: true } : {}),
      });

      if (skipSave) {
        toast.success(
          t("toast.applied", {
            ns: "views/settings",
            defaultValue: "Settings applied successfully",
          }),
        );
      } else if (needsRestart) {
        statusBar?.addMessage(
          "config_restart_required",
          t("configForm.restartRequiredFooter", {
            ns: "views/settings",
            defaultValue: "Configuration changed - Restart required",
          }),
          undefined,
          "config_restart_required",
        );
        toast.success(
          t("toast.successRestartRequired", {
            ns: "views/settings",
            defaultValue:
              "Settings saved successfully. Restart Frigate to apply your changes.",
          }),
          {
            action: (
              <a onClick={() => setRestartDialogOpen(true)}>
                <Button>
                  {t("restart.button", { ns: "components/dialog" })}
                </Button>
              </a>
            ),
          },
        );
      } else {
        toast.success(
          t("toast.success", {
            ns: "views/settings",
            defaultValue: "Settings saved successfully",
          }),
        );
      }

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
      onSavingChange?.(false);
    }
  }, [
    sectionPath,
    effectiveSectionPath,
    profileName,
    pendingData,
    effectiveLevel,
    cameraName,
    t,
    refreshConfig,
    statusBar,
    onSave,
    rawFormData,
    sanitizeSectionData,
    effectiveSchemaDefaults,
    updateTopic,
    setPendingData,
    requiresRestartForOverrides,
    skipSave,
    onSavingChange,
  ]);

  // Handle reset to global/defaults - removes camera-level override or resets global to defaults
  const handleResetToGlobal = useCallback(async () => {
    if (effectiveLevel === "camera" && !cameraName) return;

    setIsResettingToDefault(true);
    try {
      const basePath =
        effectiveLevel === "camera" && cameraName
          ? `cameras.${cameraName}.${effectiveSectionPath}`
          : effectiveSectionPath;

      const configData = buildConfigDataForPath(basePath, "");

      await axios.put("config/set", {
        requires_restart: requiresRestart ? 1 : 0,
        update_topic: updateTopic,
        config_data: configData,
      });

      toast.success(
        t("toast.resetSuccess", {
          ns: "views/settings",
          defaultValue:
            effectiveLevel === "global"
              ? "Reset to defaults"
              : "Reset to global defaults",
        }),
      );

      setPendingData(null);
      setExtraHasChanges(false);
      refreshConfig();
    } catch {
      toast.error(
        t("toast.resetError", {
          ns: "views/settings",
          defaultValue: "Failed to reset settings",
        }),
      );
    } finally {
      setIsResettingToDefault(false);
    }
  }, [
    effectiveSectionPath,
    effectiveLevel,
    cameraName,
    requiresRestart,
    t,
    refreshConfig,
    updateTopic,
    setPendingData,
  ]);

  const sectionValidation = useMemo(
    () => getSectionValidation({ sectionPath, level: effectiveLevel, t }),
    [sectionPath, effectiveLevel, t],
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

  // Wrap renderers with runtime props (selectedCamera, setUnsavedChanges, etc.)
  const wrappedRenderers = useMemo(() => {
    const baseRenderers =
      sectionConfig?.renderers ?? sectionRenderers?.[sectionPath];
    if (!baseRenderers) return undefined;

    // Create wrapper that injects runtime props
    return Object.fromEntries(
      Object.entries(baseRenderers).map(([key, RendererComponent]) => [
        key,
        (staticProps: Record<string, unknown> = {}) => (
          <RendererComponent
            {...staticProps}
            selectedCamera={cameraName}
            setUnsavedChanges={(hasChanges: boolean) => {
              // Translate setUnsavedChanges to pending data state
              const currentPending = pendingDataRef.current;
              if (hasChanges && !currentPending) {
                // Component signaled changes but we don't have pending data yet
                // This can happen when the component manages its own state
              } else if (!hasChanges && currentPending) {
                // Component signaled no changes, clear pending
                setPendingData(null);
              }
            }}
          />
        ),
      ]),
    );
  }, [sectionConfig?.renderers, sectionPath, cameraName, setPendingData]);

  if (!modifiedSchema) {
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
    effectiveLevel === "camera" ? "config/cameras" : "config/global";
  const title = t(`${sectionPath}.label`, {
    ns: configNamespace,
    defaultValue: defaultTitle,
  });

  const sectionDescription = i18n.exists(`${sectionPath}.description`, {
    ns: configNamespace,
  })
    ? t(`${sectionPath}.description`, { ns: configNamespace })
    : undefined;

  if (!sectionSchema || !config) {
    return <ActivityIndicator />;
  }

  const sectionContent = (
    <div className="space-y-6">
      <ConfigMessageBanner messages={activeMessages} />
      <ConfigForm
        key={formKey}
        schema={modifiedSchema}
        formData={currentFormData}
        onChange={handleChange}
        onValidationChange={setHasValidationErrors}
        fieldOrder={sectionConfig.fieldOrder}
        fieldGroups={sectionConfig.fieldGroups}
        hiddenFields={effectiveHiddenFields}
        advancedFields={sectionConfig.advancedFields}
        liveValidate={sectionConfig.liveValidate}
        uiSchema={effectiveUiSchema}
        disabled={disabled || isSaving}
        readonly={readonly}
        showSubmit={false}
        i18nNamespace={configNamespace}
        customValidate={customValidate}
        formContext={{
          level: effectiveLevel,
          cameraName,
          globalValue,
          cameraValue,
          hasChanges,
          extraHasChanges,
          setExtraHasChanges,
          overrides: uiOverrides as JsonValue | undefined,
          formData: currentFormData as ConfigSectionData,
          baselineFormData: effectiveBaselineFormData as ConfigSectionData,
          pendingDataBySection,
          onPendingDataChange,
          onFormDataChange: (data: ConfigSectionData) => handleChange(data),
          // For widgets that need access to full camera config (e.g., zone names)
          fullCameraConfig:
            effectiveLevel === "camera" && cameraName
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
          renderers: wrappedRenderers,
          sectionDocs: sectionConfig.sectionDocs,
          fieldDocs: sectionConfig.fieldDocs,
          hiddenFields: effectiveHiddenFields,
          restartRequired: sectionConfig.restartRequired,
          requiresRestart,
        }}
      />

      <div
        className={cn(
          "w-full border-t border-secondary bg-background pt-0",
          !noStickyButtons && "sticky bottom-0 z-50",
        )}
      >
        <div
          className={cn(
            "flex flex-col items-center gap-4 pt-2 md:flex-row",
            hasChanges ? "justify-between" : "justify-end",
          )}
        >
          {hasChanges && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-danger">
                {t("unsavedChanges", {
                  ns: "views/settings",
                  defaultValue: "You have unsaved changes",
                })}
              </span>
            </div>
          )}
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
            {((effectiveLevel === "camera" && isOverridden) ||
              effectiveLevel === "global") &&
              !hasChanges &&
              !skipSave &&
              !profileName && (
                <Button
                  onClick={() => setIsResetDialogOpen(true)}
                  variant="outline"
                  disabled={isSaving || isResettingToDefault || disabled}
                  className="flex flex-1 gap-2"
                >
                  {isResettingToDefault && (
                    <ActivityIndicator className="h-4 w-4" />
                  )}
                  {effectiveLevel === "global"
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
            {profileName &&
              profileOverridesSection &&
              !hasChanges &&
              !skipSave &&
              onDeleteProfileSection && (
                <Button
                  onClick={() => setIsDeleteProfileDialogOpen(true)}
                  variant="outline"
                  disabled={isSaving || disabled}
                  className="flex flex-1 gap-2"
                >
                  {t("profiles.removeOverride", {
                    ns: "views/settings",
                    defaultValue: "Remove Profile Override",
                  })}
                </Button>
              )}
            {hasChanges && (
              <Button
                onClick={handleReset}
                variant="outline"
                disabled={isSaving || isSavingAll || disabled}
                className="flex min-w-36 flex-1 gap-2"
              >
                {t("button.undo", { ns: "common", defaultValue: "Undo" })}
              </Button>
            )}
            <Button
              onClick={handleSave}
              variant="select"
              disabled={
                !hasChanges ||
                hasValidationErrors ||
                isSaving ||
                isSavingAll ||
                disabled
              }
              className="flex min-w-36 flex-1 gap-2"
            >
              {isSaving ? (
                <>
                  <ActivityIndicator className="h-4 w-4" />
                  {skipSave
                    ? t("button.applying", {
                        ns: "common",
                        defaultValue: "Applying...",
                      })
                    : t("button.saving", {
                        ns: "common",
                        defaultValue: "Saving...",
                      })}
                </>
              ) : skipSave ? (
                t("button.apply", { ns: "common", defaultValue: "Apply" })
              ) : (
                t("button.save", { ns: "common", defaultValue: "Save" })
              )}
            </Button>
          </div>
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
              {t("button.cancel", { ns: "common" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-selected text-white hover:bg-selected/90"
              onClick={async () => {
                await handleResetToGlobal();
                setIsResetDialogOpen(false);
              }}
            >
              {effectiveLevel === "global"
                ? t("button.resetToDefault", { ns: "common" })
                : t("button.resetToGlobal", { ns: "common" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isDeleteProfileDialogOpen}
        onOpenChange={setIsDeleteProfileDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("profiles.deleteSection", { ns: "views/settings" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("profiles.deleteSectionConfirm", {
                ns: "views/settings",
                profile: profileFriendlyName ?? profileName,
                section: t(`${sectionPath}.label`, {
                  ns:
                    effectiveLevel === "camera"
                      ? "config/cameras"
                      : "config/global",
                  defaultValue: sectionPath,
                }),
                camera: cameraName ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("button.cancel", { ns: "common" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                onDeleteProfileSection?.();
                setIsDeleteProfileDialogOpen(false);
              }}
            >
              {t("button.delete", { ns: "common" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (collapsible) {
    return (
      <>
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
                    effectiveLevel === "camera" &&
                    (profileOverridesSection || isOverridden) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="text-xs">
                            {overrideSource === "profile"
                              ? t("button.overriddenBaseConfig", {
                                  ns: "views/settings",
                                  defaultValue: "Overridden (Base Config)",
                                })
                              : t("button.overriddenGlobal", {
                                  ns: "views/settings",
                                  defaultValue: "Overridden (Global)",
                                })}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {overrideSource === "profile"
                            ? t("button.overriddenBaseConfigTooltip", {
                                ns: "views/settings",
                                profile: profileFriendlyName ?? profileName,
                              })
                            : t("button.overriddenGlobalTooltip", {
                                ns: "views/settings",
                              })}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  {hasChanges && (
                    <Badge variant="outline" className="text-xs">
                      {t("button.modified", {
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
        <RestartDialog
          isOpen={restartDialogOpen}
          onClose={() => setRestartDialogOpen(false)}
          onRestart={() => sendRestart("restart")}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {shouldShowTitle && (
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <Heading as="h4">{title}</Heading>
                {showOverrideIndicator &&
                  effectiveLevel === "camera" &&
                  (profileOverridesSection || isOverridden) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "cursor-default border-2 text-center text-xs text-primary-variant",
                            overrideSource === "profile" && profileBorderColor
                              ? profileBorderColor
                              : "border-selected",
                          )}
                        >
                          {overrideSource === "profile"
                            ? t("button.overriddenBaseConfig", {
                                ns: "views/settings",
                                defaultValue: "Overridden (Base Config)",
                              })
                            : t("button.overriddenGlobal", {
                                ns: "views/settings",
                                defaultValue: "Overridden (Global)",
                              })}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {overrideSource === "profile"
                          ? t("button.overriddenBaseConfigTooltip", {
                              ns: "views/settings",
                              profile: profileFriendlyName ?? profileName,
                            })
                          : t("button.overriddenGlobalTooltip", {
                              ns: "views/settings",
                            })}
                      </TooltipContent>
                    </Tooltip>
                  )}
                {hasChanges && (
                  <Badge
                    variant="secondary"
                    className="cursor-default bg-danger text-xs text-white hover:bg-danger"
                  >
                    {t("button.modified", {
                      ns: "common",
                      defaultValue: "Modified",
                    })}
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
      <RestartDialog
        isOpen={restartDialogOpen}
        onClose={() => setRestartDialogOpen(false)}
        onRestart={() => sendRestart("restart")}
      />
    </>
  );
}
