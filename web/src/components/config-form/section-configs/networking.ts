import type { SectionConfigOverrides } from "./types";

const networking: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/advanced/system#network-configuration",
    fieldDocs: {
      "listen.internal":
        "/configuration/advanced/system#listen-on-different-ports",
      "listen.external":
        "/configuration/advanced/system#listen-on-different-ports",
    },
    restartRequired: ["ipv6.enabled", "listen.internal", "listen.external"],
    fieldOrder: [],
    advancedFields: [],
    uiSchema: {
      "listen.internal": {
        "ui:options": {
          suppressMultiSchema: true,
          size: "sm",
        },
      },
      "listen.external": {
        "ui:options": {
          suppressMultiSchema: true,
          size: "sm",
        },
      },
    },
  },
};

export default networking;
