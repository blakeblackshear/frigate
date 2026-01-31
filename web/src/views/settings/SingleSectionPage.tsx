import { useTranslation } from "react-i18next";
import Heading from "@/components/ui/heading";
import type {
  BaseSectionProps,
  SectionConfig,
} from "@/components/config-form/sections";
import type { PolygonType } from "@/types/canvas";

export type SettingsPageProps = {
  selectedCamera?: string;
  setUnsavedChanges?: React.Dispatch<React.SetStateAction<boolean>>;
  selectedZoneMask?: PolygonType[];
};

export type SingleSectionPageOptions = {
  sectionKey: string;
  level: "global" | "camera";
  SectionComponent: React.ComponentType<BaseSectionProps>;
  sectionConfig?: SectionConfig;
  requiresRestart?: boolean;
  showOverrideIndicator?: boolean;
};

export function createSingleSectionPage({
  sectionKey,
  level,
  SectionComponent,
  sectionConfig,
  requiresRestart,
  showOverrideIndicator = true,
}: SingleSectionPageOptions) {
  return function SingleSectionPage({
    selectedCamera,
    setUnsavedChanges,
  }: SettingsPageProps) {
    const sectionNamespace =
      level === "camera" ? "config/cameras" : "config/global";
    const { t, i18n } = useTranslation([
      sectionNamespace,
      "views/settings",
      "common",
    ]);

    if (level === "camera" && !selectedCamera) {
      return (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          {t("configForm.camera.noCameras", { ns: "views/settings" })}
        </div>
      );
    }

    return (
      <div className="flex size-full flex-col pr-2">
        <div className="mb-4">
          <Heading as="h2">
            {t(`${sectionKey}.label`, { ns: sectionNamespace })}
          </Heading>
          {i18n.exists(`${sectionKey}.description`, {
            ns: sectionNamespace,
          }) && (
            <p className="text-sm text-muted-foreground">
              {t(`${sectionKey}.description`, { ns: sectionNamespace })}
            </p>
          )}
        </div>
        <SectionComponent
          level={level}
          cameraName={level === "camera" ? selectedCamera : undefined}
          showOverrideIndicator={showOverrideIndicator}
          onSave={() => setUnsavedChanges?.(false)}
          showTitle={false}
          sectionConfig={sectionConfig}
          requiresRestart={requiresRestart}
        />
      </div>
    );
  };
}
