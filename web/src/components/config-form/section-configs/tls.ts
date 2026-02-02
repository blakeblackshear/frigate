import type { SectionConfigOverrides } from "./types";

const tls: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/tls",
    restartRequired: [],
    fieldOrder: ["enabled", "cert", "key"],
    advancedFields: [],
  },
};

export default tls;
