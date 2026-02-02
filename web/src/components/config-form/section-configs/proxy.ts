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
  },
};

export default proxy;
