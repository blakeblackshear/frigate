import type { SectionConfigOverrides } from "./types";

const mqtt: SectionConfigOverrides = {
  base: {
    sectionDocs: "/integrations/mqtt",
    restartRequired: [],
    fieldOrder: [
      "enabled",
      "timestamp",
      "bounding_box",
      "crop",
      "height",
      "required_zones",
      "quality",
    ],
    hiddenFields: [],
    advancedFields: ["height", "quality"],
    overrideFields: [],
    uiSchema: {
      required_zones: {
        "ui:widget": "zoneNames",
      },
    },
  },
  global: {
    fieldOrder: [
      "enabled",
      "host",
      "port",
      "user",
      "password",
      "topic_prefix",
      "client_id",
      "stats_interval",
      "qos",
      "tls_ca_certs",
      "tls_client_cert",
      "tls_client_key",
      "tls_insecure",
    ],
    advancedFields: [
      "stats_interval",
      "qos",
      "tls_ca_certs",
      "tls_client_cert",
      "tls_client_key",
      "tls_insecure",
    ],
    restartRequired: [
      "enabled",
      "host",
      "port",
      "user",
      "password",
      "topic_prefix",
      "client_id",
      "stats_interval",
      "qos",
      "tls_ca_certs",
      "tls_client_cert",
      "tls_client_key",
      "tls_insecure",
    ],
    liveValidate: true,
    uiSchema: {
      password: {
        "ui:options": { size: "xs" },
      },
    },
  },
};

export default mqtt;
