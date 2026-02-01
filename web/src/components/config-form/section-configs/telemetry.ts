import type { SectionConfigOverrides } from "./types";

const telemetry: SectionConfigOverrides = {
  base: {
    fieldOrder: ["network_interfaces", "stats", "version_check"],
    advancedFields: [],
  },
};

export default telemetry;
