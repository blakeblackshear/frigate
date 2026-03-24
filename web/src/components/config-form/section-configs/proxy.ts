import type { SectionConfigOverrides } from "./types";

const proxy: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/authentication#proxy",
    restartRequired: [],
    fieldOrder: [
      "header_map",
      "logout_url",
      "auth_secret",
      "default_role",
      "separator",
    ],
    advancedFields: ["header_map", "auth_secret", "separator"],
    liveValidate: true,
    uiSchema: {
      logout_url: {
        "ui:options": { size: "lg" },
      },
      auth_secret: {
        "ui:options": { size: "md" },
      },
      header_map: {
        "ui:after": { render: "ProxyRoleMap" },
      },
      "header_map.role_map": {
        "ui:widget": "hidden",
      },
    },
  },
};

export default proxy;
