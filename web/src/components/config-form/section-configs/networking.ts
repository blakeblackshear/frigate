import type { SectionConfigOverrides } from "./types";

const networking: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/advanced",
    fieldDocs: {
      "listen.internal": "/configuration/advanced#listen-on-different-ports",
      "listen.external": "/configuration/advanced#listen-on-different-ports",
    },
    restartRequired: [],
    fieldOrder: [],
    advancedFields: [],
    uiSchema: {
      "listen.internal": {
        "ui:options": {
          suppressMultiSchema: true,
        },
      },
      "listen.external": {
        "ui:options": {
          suppressMultiSchema: true,
        },
      },
    },
  },
};

export default networking;
