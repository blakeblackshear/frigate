import mergeWith from "lodash/mergeWith";
import type { SectionConfig } from "../components/config-form/sections/BaseSection";
import { sectionConfigs } from "../components/config-form/sectionConfigs";

const mergeSectionConfig = (
  base: SectionConfig | undefined,
  overrides: Partial<SectionConfig> | undefined,
): SectionConfig =>
  mergeWith({}, base ?? {}, overrides ?? {}, (objValue, srcValue, key) => {
    if (Array.isArray(objValue) || Array.isArray(srcValue)) {
      return srcValue ?? objValue;
    }

    if (key === "uiSchema" && srcValue !== undefined) {
      return srcValue;
    }

    return undefined;
  });

export function getSectionConfig(
  sectionKey: string,
  level: "global" | "camera",
): SectionConfig {
  const entry = sectionConfigs[sectionKey];
  if (!entry) {
    return {};
  }

  const overrides = level === "global" ? entry.global : entry.camera;
  return mergeSectionConfig(entry.base, overrides);
}
