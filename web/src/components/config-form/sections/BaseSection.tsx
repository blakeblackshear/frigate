// Base Section Component for config form sections
// Used as a foundation for reusable section components

import { useMemo, useCallback } from "react";
import useSWR from "swr";
import axios from "axios";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ConfigForm } from "../ConfigForm";
import { useConfigOverride } from "@/hooks/use-config-override";
import { useSectionSchema } from "@/hooks/use-config-schema";
import type { FrigateConfig } from "@/types/frigateConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LuRotateCcw } from "react-icons/lu";
import get from "lodash/get";

export interface SectionConfig {
  /** Field ordering within the section */
  fieldOrder?: string[];
  /** Fields to group together */
  fieldGroups?: Record<string, string[]>;
  /** Fields to hide from UI */
  hiddenFields?: string[];
  /** Fields to show in advanced section */
  advancedFields?: string[];
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
}

export interface CreateSectionOptions {
  /** The config path for this section (e.g., "detect", "record") */
  sectionPath: string;
  /** Translation key prefix for this section */
  translationKey: string;
  /** Default section configuration */
  defaultConfig: SectionConfig;
}

/**
 * Factory function to create reusable config section components
 */
export function createConfigSection({
  sectionPath,
  translationKey,
  defaultConfig,
}: CreateSectionOptions) {
  return function ConfigSection({
    level,
    cameraName,
    showOverrideIndicator = true,
    sectionConfig = defaultConfig,
    disabled = false,
    readonly = false,
    onSave,
    requiresRestart = true,
  }: BaseSectionProps) {
    const { t } = useTranslation(["views/settings"]);

    // Fetch config
    const { data: config, mutate: refreshConfig } =
      useSWR<FrigateConfig>("config");

    // Get section schema using cached hook
    const sectionSchema = useSectionSchema(sectionPath, level);

    // Get override status
    const { isOverridden, globalValue, cameraValue, resetToGlobal } =
      useConfigOverride({
        config,
        cameraName: level === "camera" ? cameraName : undefined,
        sectionPath,
      });

    // Get current form data
    const formData = useMemo(() => {
      if (!config) return {};

      if (level === "camera" && cameraName) {
        return get(config.cameras?.[cameraName], sectionPath) || {};
      }

      return get(config, sectionPath) || {};
    }, [config, level, cameraName]);

    // Handle form submission
    const handleSubmit = useCallback(
      async (data: Record<string, unknown>) => {
        try {
          const basePath =
            level === "camera" && cameraName
              ? `cameras.${cameraName}.${sectionPath}`
              : sectionPath;

          await axios.put("config/set", {
            requires_restart: requiresRestart ? 1 : 0,
            config_data: {
              [basePath]: data,
            },
          });

          toast.success(
            t(`${translationKey}.toast.success`, {
              defaultValue: "Settings saved successfully",
            }),
          );

          refreshConfig();
          onSave?.();
        } catch (error) {
          // Parse Pydantic validation errors from API response
          if (axios.isAxiosError(error) && error.response?.data) {
            const responseData = error.response.data;
            // Pydantic errors come as { detail: [...] } or { message: "..." }
            if (responseData.detail && Array.isArray(responseData.detail)) {
              const validationMessages = responseData.detail
                .map((err: { loc?: string[]; msg?: string }) => {
                  const field = err.loc?.slice(1).join(".") || "unknown";
                  return `${field}: ${err.msg || "Invalid value"}`;
                })
                .join(", ");
              toast.error(
                t(`${translationKey}.toast.validationError`, {
                  defaultValue: `Validation failed: ${validationMessages}`,
                }),
              );
            } else if (responseData.message) {
              toast.error(responseData.message);
            } else {
              toast.error(
                t(`${translationKey}.toast.error`, {
                  defaultValue: "Failed to save settings",
                }),
              );
            }
          } else {
            toast.error(
              t(`${translationKey}.toast.error`, {
                defaultValue: "Failed to save settings",
              }),
            );
          }
        }
      },
      [level, cameraName, requiresRestart, t, refreshConfig, onSave],
    );

    // Handle reset to global
    const handleResetToGlobal = useCallback(async () => {
      if (level !== "camera" || !cameraName) return;

      try {
        const basePath = `cameras.${cameraName}.${sectionPath}`;

        // Reset by setting to null/undefined or removing the override
        await axios.put("config/set", {
          requires_restart: requiresRestart ? 1 : 0,
          config_data: {
            [basePath]: resetToGlobal(),
          },
        });

        toast.success(
          t(`${translationKey}.toast.resetSuccess`, {
            defaultValue: "Reset to global defaults",
          }),
        );

        refreshConfig();
      } catch {
        toast.error(
          t(`${translationKey}.toast.resetError`, {
            defaultValue: "Failed to reset settings",
          }),
        );
      }
    }, [level, cameraName, requiresRestart, t, refreshConfig, resetToGlobal]);

    if (!sectionSchema) {
      return null;
    }

    const title = t(`${translationKey}.title`, {
      defaultValue: sectionPath.charAt(0).toUpperCase() + sectionPath.slice(1),
    });

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{title}</CardTitle>
            {showOverrideIndicator && level === "camera" && isOverridden && (
              <Badge variant="secondary" className="text-xs">
                {t("common.overridden", { defaultValue: "Overridden" })}
              </Badge>
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
              {t("common.resetToGlobal", { defaultValue: "Reset to Global" })}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <ConfigForm
            schema={sectionSchema}
            formData={formData}
            onSubmit={handleSubmit}
            fieldOrder={sectionConfig.fieldOrder}
            hiddenFields={sectionConfig.hiddenFields}
            advancedFields={sectionConfig.advancedFields}
            disabled={disabled}
            readonly={readonly}
            formContext={{
              level,
              cameraName,
              globalValue,
              cameraValue,
            }}
          />
        </CardContent>
      </Card>
    );
  };
}
