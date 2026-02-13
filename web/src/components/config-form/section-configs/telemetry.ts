import type { SectionConfigOverrides } from "./types";

const telemetry: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/reference",
    restartRequired: [
      "network_interfaces",
      "stats.amd_gpu_stats",
      "stats.intel_gpu_stats",
      "stats.intel_gpu_device",
      "stats.network_bandwidth",
      "version_check",
    ],
    fieldOrder: ["network_interfaces", "stats", "version_check"],
    advancedFields: [],
  },
};

export default telemetry;
