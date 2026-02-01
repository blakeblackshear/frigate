import type { SectionConfig } from "../sections/BaseSection";

export type SectionConfigOverrides = {
  base?: SectionConfig;
  global?: Partial<SectionConfig>;
  camera?: Partial<SectionConfig>;
};
