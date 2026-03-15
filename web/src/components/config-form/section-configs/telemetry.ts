import type { SectionConfigOverrides } from "./types";

const telemetry: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/reference",
    restartRequired: ["version_check"],
    fieldOrder: ["network_interfaces", "stats", "version_check"],
    advancedFields: [],
  },
};

export default telemetry;
