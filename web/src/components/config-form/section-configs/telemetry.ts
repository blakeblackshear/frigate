import type { SectionConfigOverrides } from "./types";

const telemetry: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/advanced/reference",
    fieldDocs: {
      analytics: "/configuration/advanced/analytics",
    },
    restartRequired: ["version_check"],
    fieldOrder: ["analytics", "network_interfaces", "stats", "version_check"],
    advancedFields: [],
    uiSchema: {
      analytics: {
        "ui:after": { render: "AnalyticsPreview" },
      },
    },
  },
};

export default telemetry;
