import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Heading from "@/components/ui/heading";
import type { SectionConfig } from "@/components/config-form/sections";
import { ConfigSectionTemplate } from "@/components/config-form/sections";
import type { PolygonType } from "@/types/canvas";
import { Badge } from "@/components/ui/badge";

export type SettingsPageProps = {
  selectedCamera?: string;
  setUnsavedChanges?: React.Dispatch<React.SetStateAction<boolean>>;
  selectedZoneMask?: PolygonType[];
  onSectionStatusChange?: (
    sectionKey: string,
    level: "global" | "camera",
    status: SectionStatus,
  ) => void;
};

export type SectionStatus = {
  hasChanges: boolean;
  isOverridden: boolean;
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
}: SingleSectionPageProps) {
  const sectionNamespace =
    level === "camera" ? "config/cameras" : "config/global";
  const { t, i18n } = useTranslation([
    sectionNamespace,
    "views/settings",
    "common",
  ]);
  const [sectionStatus, setSectionStatus] = useState<SectionStatus>({
    hasChanges: false,
    isOverridden: false,
  });

  useEffect(() => {
    onSectionStatusChange?.(sectionKey, level, sectionStatus);
  }, [onSectionStatusChange, sectionKey, level, sectionStatus]);

  if (level === "camera" && !selectedCamera) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        {t("configForm.camera.noCameras", { ns: "views/settings" })}
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col pr-2">
      <div className="space-y-4">
        <Heading as="h3">
          {t(`${sectionKey}.label`, { ns: sectionNamespace })}
        </Heading>

        {i18n.exists(`${sectionKey}.description`, {
          ns: sectionNamespace,
        }) && (
          <p className="text-sm text-muted-foreground">
            {t(`${sectionKey}.description`, { ns: sectionNamespace })}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {level === "camera" &&
            showOverrideIndicator &&
            sectionStatus.isOverridden && (
              <Badge variant="secondary" className="text-xs">
                {t("overridden", { ns: "common", defaultValue: "Overridden" })}
              </Badge>
            )}
          {sectionStatus.hasChanges && (
            <Badge variant="outline" className="text-xs">
              {t("modified", { ns: "common", defaultValue: "Modified" })}
            </Badge>
          )}
        </div>
      </div>
      <ConfigSectionTemplate
        sectionKey={sectionKey}
        level={level}
        cameraName={level === "camera" ? selectedCamera : undefined}
        showOverrideIndicator={showOverrideIndicator}
        onSave={() => setUnsavedChanges?.(false)}
        showTitle={false}
        sectionConfig={sectionConfig}
        requiresRestart={requiresRestart}
        onStatusChange={setSectionStatus}
      />
    </div>
  );
}
