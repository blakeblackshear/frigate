import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SectionConfig } from "@/components/config-form/sections";
import { ConfigSectionTemplate } from "@/components/config-form/sections";
import type { PolygonType } from "@/types/canvas";
import { Badge } from "@/components/ui/badge";
import type { ConfigSectionData } from "@/types/configForm";
import { getSectionConfig } from "@/utils/configUtil";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { Link } from "react-router-dom";
import { LuExternalLink } from "react-icons/lu";
import Heading from "@/components/ui/heading";

export type SettingsPageProps = {
  selectedCamera?: string;
  setUnsavedChanges?: React.Dispatch<React.SetStateAction<boolean>>;
  selectedZoneMask?: PolygonType[];
  onSectionStatusChange?: (
    sectionKey: string,
    level: "global" | "camera",
    status: SectionStatus,
  ) => void;
  pendingDataBySection?: Record<string, unknown>;
  onPendingDataChange?: (
    sectionKey: string,
    cameraName: string | undefined,
    data: ConfigSectionData | null,
  ) => void;
};

export type SectionStatus = {
  hasChanges: boolean;
  isOverridden: boolean;
  hasValidationErrors: boolean;
};

export type SingleSectionPageOptions = {
  sectionKey: string;
  level: "global" | "camera";
  sectionConfig?: SectionConfig;
  requiresRestart?: boolean;
  showOverrideIndicator?: boolean;
};

export type SingleSectionPageProps = SettingsPageProps &
  SingleSectionPageOptions;

export function SingleSectionPage({
  sectionKey,
  level,
  sectionConfig,
  requiresRestart,
  showOverrideIndicator = true,
  selectedCamera,
  setUnsavedChanges,
  onSectionStatusChange,
  pendingDataBySection,
  onPendingDataChange,
}: SingleSectionPageProps) {
  const sectionNamespace =
    level === "camera" ? "config/cameras" : "config/global";
  const { t, i18n } = useTranslation([
    sectionNamespace,
    "views/settings",
    "common",
  ]);
  const { getLocaleDocUrl } = useDocDomain();
  const [sectionStatus, setSectionStatus] = useState<SectionStatus>({
    hasChanges: false,
    isOverridden: false,
    hasValidationErrors: false,
  });
  const resolvedSectionConfig = useMemo(
    () => sectionConfig ?? getSectionConfig(sectionKey, level),
    [level, sectionConfig, sectionKey],
  );
  const sectionDocsUrl = resolvedSectionConfig.sectionDocs
    ? getLocaleDocUrl(resolvedSectionConfig.sectionDocs)
    : undefined;

  const handleSectionStatusChange = useCallback(
    (status: SectionStatus) => {
      setSectionStatus(status);
      onSectionStatusChange?.(sectionKey, level, status);
    },
    [level, onSectionStatusChange, sectionKey],
  );

  if (level === "camera" && !selectedCamera) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        {t("configForm.camera.noCameras", { ns: "views/settings" })}
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col lg:pr-2">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <Heading as="h4">
            {t(`${sectionKey}.label`, { ns: sectionNamespace })}
          </Heading>
          {i18n.exists(`${sectionKey}.description`, {
            ns: sectionNamespace,
          }) && (
            <div className="my-1 text-sm text-muted-foreground">
              {t(`${sectionKey}.description`, { ns: sectionNamespace })}
            </div>
          )}
          {sectionDocsUrl && (
            <div className="flex items-center text-sm text-primary-variant">
              <Link
                to={sectionDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline"
              >
                {t("readTheDocumentation", { ns: "common" })}
                <LuExternalLink className="ml-2 inline-flex size-3" />
              </Link>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {level === "camera" &&
              showOverrideIndicator &&
              sectionStatus.isOverridden && (
                <Badge
                  variant="secondary"
                  className="cursor-default border-2 border-selected text-xs text-primary-variant"
                >
                  {t("button.overridden", {
                    ns: "common",
                    defaultValue: "Overridden",
                  })}
                </Badge>
              )}
            {sectionStatus.hasChanges && (
              <Badge
                variant="secondary"
                className="cursor-default bg-danger text-xs text-white hover:bg-danger"
              >
                {t("modified", { ns: "common", defaultValue: "Modified" })}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <ConfigSectionTemplate
        sectionKey={sectionKey}
        level={level}
        cameraName={level === "camera" ? selectedCamera : undefined}
        showOverrideIndicator={showOverrideIndicator}
        onSave={() => setUnsavedChanges?.(false)}
        showTitle={false}
        sectionConfig={resolvedSectionConfig}
        pendingDataBySection={pendingDataBySection}
        onPendingDataChange={onPendingDataChange}
        requiresRestart={requiresRestart}
        onStatusChange={handleSectionStatusChange}
      />
    </div>
  );
}
