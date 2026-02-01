import { useMemo } from "react";
import { createConfigSection } from "./BaseSection";
import type { BaseSectionProps, SectionConfig } from "./BaseSection";
import { getSectionConfig } from "@/utils/sectionConfigsUtils";

export type ConfigSectionTemplateProps = BaseSectionProps & {
  sectionKey: string;
  sectionConfig?: SectionConfig;
};

export function ConfigSectionTemplate({
  sectionKey,
  level,
  sectionConfig,
  ...rest
}: ConfigSectionTemplateProps) {
  const defaultConfig = useMemo(
    () => getSectionConfig(sectionKey, level),
    [sectionKey, level],
  );

  const SectionComponent = useMemo(
    () =>
      createConfigSection({
        sectionPath: sectionKey,
        defaultConfig,
      }),
    [sectionKey, defaultConfig],
  );

  return (
    <SectionComponent
      level={level}
      sectionConfig={sectionConfig ?? defaultConfig}
      {...rest}
    />
  );
}

export default ConfigSectionTemplate;
