import type { SectionConfigOverrides } from "./types";

const networking: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/advanced",
    fieldDocs: {
      "listen.internal": "/configuration/advanced#listen-on-different-ports",
      "listen.external": "/configuration/advanced#listen-on-different-ports",
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
