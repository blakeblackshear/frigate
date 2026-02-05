import type { SectionConfigOverrides } from "./types";

const auth: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/authentication",
    restartRequired: [],
    fieldOrder: [
      "enabled",
      "reset_admin_password",
      "cookie_name",
      "cookie_secure",
      "session_length",
      "refresh_time",
      "native_oauth_url",
      "failed_login_rate_limit",
      "trusted_proxies",
      "hash_iterations",
      "roles",
    ],
    hiddenFields: ["admin_first_time_login", "roles"],
    advancedFields: [
      "cookie_name",
      "cookie_secure",
      "session_length",
      "refresh_time",
      "failed_login_rate_limit",
      "trusted_proxies",
      "hash_iterations",
      "roles",
    ],
    uiSchema: {
      reset_admin_password: {
        "ui:widget": "switch",
      },
    },
  },
};

export default auth;
