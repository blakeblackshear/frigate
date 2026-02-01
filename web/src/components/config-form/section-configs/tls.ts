import type { SectionConfigOverrides } from "./types";

const tls: SectionConfigOverrides = {
  base: {
    fieldOrder: ["enabled", "cert", "key"],
    advancedFields: [],
  },
};

export default tls;
