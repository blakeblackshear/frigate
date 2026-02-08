import { useMemo } from "react";
import { ConfigSection } from "./BaseSection";
import type { BaseSectionProps, SectionConfig } from "./BaseSection";
import { getSectionConfig } from "@/utils/configUtil";

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

  return (
    <ConfigSection
      sectionPath={sectionKey}
      defaultConfig={defaultConfig}
      level={level}
      sectionConfig={sectionConfig ?? defaultConfig}
      {...rest}
    />
  );
}

export default ConfigSectionTemplate;
