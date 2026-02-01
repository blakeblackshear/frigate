import type { SectionConfigOverrides } from "./types";

const logger: SectionConfigOverrides = {
  base: {
    fieldOrder: ["default", "logs"],
    advancedFields: ["logs"],
  },
};

export default logger;
