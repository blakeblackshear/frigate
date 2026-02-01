/*
  sectionConfigs.ts — section configuration overrides

  Purpose:
  - Centralize UI configuration hints for each config section (field ordering,
    grouping, hidden/advanced fields, uiSchema overrides, and overrideFields).

  Shape:
  - Each section key maps to an object with optional `base`, `global`, and
    `camera` entries where each is a `SectionConfig` (or partial):
      {
        base?: SectionConfig;       // common defaults (typically camera-level)
        global?: Partial<SectionConfig>; // overrides for global-level UI
        camera?: Partial<SectionConfig>; // overrides for camera-level UI
      }

  Merge rules (used by getSectionConfig):
  - `base` is the canonical default and is merged with level-specific overrides.
  - Arrays (e.g., `fieldOrder`, `advancedFields`, etc.) in overrides **replace**
    the `base` arrays (they are not concatenated).
  - `uiSchema` in an override **replaces** the base `uiSchema` rather than deep-merging
    (this keeps widget overrides explicit per level).
  - Other object properties are deep-merged using lodash.mergeWith with custom
    behavior for arrays and `uiSchema` as described.

  Example — `ffmpeg`:
  - `base` (camera defaults) may include `inputs` and a `fieldOrder` that shows
    `"inputs"` first.
  - `global` override can replace `fieldOrder` with a different ordering
    (e.g., omit `inputs` and show `path` first). Calling
    `getSectionConfig("ffmpeg", "global")` will return the merged config
    where `fieldOrder` comes from `global` (not concatenated with `base`).
*/

import mergeWith from "lodash/mergeWith";
import type { SectionConfig } from "./sections/BaseSection";

export type SectionConfigOverrides = {
  base?: SectionConfig;
  global?: Partial<SectionConfig>;
  camera?: Partial<SectionConfig>;
};

const sectionConfigs: Record<string, SectionConfigOverrides> = {
  detect: {
    base: {
      fieldOrder: [
        "enabled",
        "fps",
        "width",
        "height",
        "min_initialized",
        "max_disappeared",
        "annotation_offset",
        "stationary",
      ],
      fieldGroups: {
        resolution: ["enabled", "width", "height"],
        tracking: ["min_initialized", "max_disappeared"],
      },
      hiddenFields: ["enabled_in_config"],
      advancedFields: [
        "min_initialized",
        "max_disappeared",
        "annotation_offset",
        "stationary",
      ],
    },
  },
  record: {
    base: {
      fieldOrder: [
        "enabled",
        "expire_interval",
        "continuous",
        "motion",
        "alerts",
        "detections",
        "preview",
        "export",
      ],
      fieldGroups: {
        retention: ["enabled", "continuous", "motion"],
        events: ["alerts", "detections"],
      },
      hiddenFields: ["enabled_in_config", "sync_recordings"],
      advancedFields: ["expire_interval", "preview", "export"],
    },
  },
  snapshots: {
    base: {
      fieldOrder: [
        "enabled",
        "bounding_box",
        "crop",
        "quality",
        "timestamp",
        "retain",
      ],
      fieldGroups: {
        display: ["enabled", "bounding_box", "crop", "quality", "timestamp"],
      },
      hiddenFields: ["enabled_in_config"],
      advancedFields: ["quality", "retain"],
      uiSchema: {
        required_zones: {
          "ui:widget": "zoneNames",
          "ui:options": {
            suppressMultiSchema: true,
          },
        },
      },
    },
  },
  motion: {
    base: {
      fieldOrder: [
        "enabled",
        "threshold",
        "lightning_threshold",
        "improve_contrast",
        "contour_area",
        "delta_alpha",
        "frame_alpha",
        "frame_height",
        "mask",
        "mqtt_off_delay",
      ],
      fieldGroups: {
        sensitivity: ["enabled", "threshold", "contour_area"],
        algorithm: ["improve_contrast", "delta_alpha", "frame_alpha"],
      },
      hiddenFields: ["enabled_in_config", "mask", "raw_mask"],
      advancedFields: [
        "lightning_threshold",
        "delta_alpha",
        "frame_alpha",
        "frame_height",
        "mqtt_off_delay",
      ],
    },
  },
  objects: {
    base: {
      fieldOrder: ["track", "alert", "detect", "filters"],
      fieldGroups: {
        tracking: ["track", "alert", "detect"],
        filtering: ["filters"],
      },
      hiddenFields: [
        "enabled_in_config",
        "mask",
        "raw_mask",
        "genai.enabled_in_config",
        "filters.*.mask",
        "filters.*.raw_mask",
      ],
      advancedFields: ["filters"],
      uiSchema: {
        "filters.*.min_area": {
          "ui:options": {
            suppressMultiSchema: true,
          },
        },
        "filters.*.max_area": {
          "ui:options": {
            suppressMultiSchema: true,
          },
        },
        track: {
          "ui:widget": "objectLabels",
          "ui:options": {
            suppressMultiSchema: true,
          },
        },
        genai: {
          objects: {
            "ui:widget": "objectLabels",
            "ui:options": {
              suppressMultiSchema: true,
            },
          },
          required_zones: {
            "ui:widget": "zoneNames",
            "ui:options": {
              suppressMultiSchema: true,
            },
          },
          enabled_in_config: {
            "ui:widget": "hidden",
          },
        },
      },
    },
  },
  review: {
    base: {
      fieldOrder: ["alerts", "detections", "genai"],
      fieldGroups: {},
      hiddenFields: [
        "enabled_in_config",
        "alerts.labels",
        "alerts.enabled_in_config",
        "alerts.required_zones",
        "detections.labels",
        "detections.enabled_in_config",
        "detections.required_zones",
        "genai.enabled_in_config",
      ],
      advancedFields: [],
      uiSchema: {
        genai: {
          additional_concerns: {
            "ui:widget": "textarea",
          },
          activity_context_prompt: {
            "ui:widget": "textarea",
          },
        },
      },
    },
  },
  audio: {
    base: {
      fieldOrder: [
        "enabled",
        "listen",
        "filters",
        "min_volume",
        "max_not_heard",
        "num_threads",
      ],
      fieldGroups: {
        detection: ["enabled", "listen", "filters"],
        sensitivity: ["min_volume", "max_not_heard"],
      },
      hiddenFields: ["enabled_in_config"],
      advancedFields: ["min_volume", "max_not_heard", "num_threads"],
      uiSchema: {
        listen: {
          "ui:widget": "audioLabels",
        },
      },
    },
  },
  live: {
    base: {
      fieldOrder: ["stream_name", "height", "quality"],
      fieldGroups: {},
      hiddenFields: ["enabled_in_config"],
      advancedFields: ["quality"],
    },
  },
  timestamp_style: {
    base: {
      fieldOrder: ["position", "format", "color", "thickness"],
      hiddenFields: ["effect", "enabled_in_config"],
      advancedFields: [],
    },
  },
  notifications: {
    base: {
      fieldOrder: ["enabled", "email"],
      fieldGroups: {},
      hiddenFields: ["enabled_in_config"],
      advancedFields: [],
    },
  },
  onvif: {
    base: {
      fieldOrder: [
        "host",
        "port",
        "user",
        "password",
        "tls_insecure",
        "ignore_time_mismatch",
        "autotracking",
      ],
      hiddenFields: [
        "autotracking.enabled_in_config",
        "autotracking.movement_weights",
      ],
      advancedFields: ["tls_insecure", "ignore_time_mismatch"],
      overrideFields: [],
      uiSchema: {
        autotracking: {
          required_zones: {
            "ui:widget": "zoneNames",
          },
          track: {
            "ui:widget": "objectLabels",
          },
        },
      },
    },
  },
  ffmpeg: {
    base: {
      fieldOrder: [
        "inputs",
        "path",
        "global_args",
        "hwaccel_args",
        "input_args",
        "output_args",
        "retry_interval",
        "apple_compatibility",
        "gpu",
      ],
      hiddenFields: [],
      advancedFields: [
        "global_args",
        "hwaccel_args",
        "input_args",
        "output_args",
        "retry_interval",
        "apple_compatibility",
        "gpu",
      ],
      overrideFields: [
        "path",
        "global_args",
        "hwaccel_args",
        "input_args",
        "output_args",
        "retry_interval",
        "apple_compatibility",
        "gpu",
      ],
      uiSchema: {
        global_args: {
          "ui:widget": "ArrayAsTextWidget",
          "ui:options": {
            suppressMultiSchema: true,
          },
        },
        hwaccel_args: {
          "ui:widget": "ArrayAsTextWidget",
          "ui:options": {
            suppressMultiSchema: true,
          },
        },
        input_args: {
          "ui:widget": "ArrayAsTextWidget",
          "ui:options": {
            suppressMultiSchema: true,
          },
        },
        output_args: {
          "ui:widget": "ArrayAsTextWidget",
          "ui:options": {
            suppressMultiSchema: true,
          },
          detect: {
            "ui:widget": "ArrayAsTextWidget",
            "ui:options": {
              suppressMultiSchema: true,
            },
          },
          record: {
            "ui:widget": "ArrayAsTextWidget",
            "ui:options": {
              suppressMultiSchema: true,
            },
          },
          items: {
            detect: {
              "ui:widget": "ArrayAsTextWidget",
              "ui:options": {
                suppressMultiSchema: true,
              },
            },
            record: {
              "ui:widget": "ArrayAsTextWidget",
              "ui:options": {
                suppressMultiSchema: true,
              },
            },
          },
        },
        inputs: {
          items: {
            global_args: {
              "ui:widget": "ArrayAsTextWidget",
              "ui:options": {
                suppressMultiSchema: true,
              },
            },
            hwaccel_args: {
              "ui:widget": "ArrayAsTextWidget",
              "ui:options": {
                suppressMultiSchema: true,
              },
            },
            input_args: {
              "ui:widget": "ArrayAsTextWidget",
              "ui:options": {
                suppressMultiSchema: true,
              },
            },
            output_args: {
              "ui:widget": "ArrayAsTextWidget",
              "ui:options": {
                suppressMultiSchema: true,
              },
              items: {
                detect: {
                  "ui:widget": "ArrayAsTextWidget",
                  "ui:options": {
                    suppressMultiSchema: true,
                  },
                },
                record: {
                  "ui:widget": "ArrayAsTextWidget",
                  "ui:options": {
                    suppressMultiSchema: true,
                  },
                },
              },
            },
          },
        },
      },
    },
    global: {
      fieldOrder: [
        "path",
        "global_args",
        "hwaccel_args",
        "input_args",
        "output_args",
        "retry_interval",
        "apple_compatibility",
        "gpu",
      ],
      advancedFields: [
        "global_args",
        "hwaccel_args",
        "input_args",
        "output_args",
        "retry_interval",
        "apple_compatibility",
        "gpu",
      ],
      uiSchema: {
        global_args: {
          "ui:widget": "ArrayAsTextWidget",
          "ui:options": {
            suppressMultiSchema: true,
          },
        },
        hwaccel_args: {
          "ui:widget": "ArrayAsTextWidget",
          "ui:options": {
            suppressMultiSchema: true,
          },
        },
        input_args: {
          "ui:widget": "ArrayAsTextWidget",
          "ui:options": {
            suppressMultiSchema: true,
          },
        },
        output_args: {
          "ui:widget": "ArrayAsTextWidget",
          "ui:options": {
            suppressMultiSchema: true,
          },
          detect: {
            "ui:widget": "ArrayAsTextWidget",
            "ui:options": {
              suppressMultiSchema: true,
            },
          },
          record: {
            "ui:widget": "ArrayAsTextWidget",
            "ui:options": {
              suppressMultiSchema: true,
            },
          },
        },
      },
    },
  },
  audio_transcription: {
    base: {
      fieldOrder: [
        "enabled",
        "language",
        "device",
        "model_size",
        "live_enabled",
      ],
      hiddenFields: ["enabled_in_config"],
      advancedFields: ["language", "device", "model_size"],
      overrideFields: ["enabled", "live_enabled"],
    },
    global: {
      fieldOrder: [
        "enabled",
        "language",
        "device",
        "model_size",
        "live_enabled",
      ],
      advancedFields: ["language", "device", "model_size"],
    },
  },
  birdseye: {
    base: {
      fieldOrder: ["enabled", "mode", "order"],
      hiddenFields: [],
      advancedFields: [],
      overrideFields: ["enabled", "mode"],
    },
    global: {
      fieldOrder: [
        "enabled",
        "restream",
        "width",
        "height",
        "quality",
        "mode",
        "layout",
        "inactivity_threshold",
        "idle_heartbeat_fps",
      ],
      advancedFields: ["width", "height", "quality", "inactivity_threshold"],
    },
  },
  face_recognition: {
    base: {
      fieldOrder: ["enabled", "min_area"],
      hiddenFields: [],
      advancedFields: ["min_area"],
      overrideFields: ["enabled", "min_area"],
    },
    global: {
      fieldOrder: [
        "enabled",
        "model_size",
        "unknown_score",
        "detection_threshold",
        "recognition_threshold",
        "min_area",
        "min_faces",
        "save_attempts",
        "blur_confidence_filter",
        "device",
      ],
      advancedFields: [
        "unknown_score",
        "detection_threshold",
        "recognition_threshold",
        "min_area",
        "min_faces",
        "save_attempts",
        "blur_confidence_filter",
        "device",
      ],
    },
  },
  lpr: {
    base: {
      fieldOrder: ["enabled", "expire_time", "min_area", "enhancement"],
      hiddenFields: [],
      advancedFields: ["expire_time", "min_area", "enhancement"],
      overrideFields: ["enabled", "min_area", "enhancement"],
    },
    global: {
      fieldOrder: [
        "enabled",
        "model_size",
        "detection_threshold",
        "min_area",
        "recognition_threshold",
        "min_plate_length",
        "format",
        "match_distance",
        "known_plates",
        "enhancement",
        "debug_save_plates",
        "device",
        "replace_rules",
      ],
      advancedFields: [
        "detection_threshold",
        "recognition_threshold",
        "min_plate_length",
        "format",
        "match_distance",
        "known_plates",
        "enhancement",
        "debug_save_plates",
        "device",
        "replace_rules",
      ],
    },
  },
  semantic_search: {
    base: {
      fieldOrder: ["triggers"],
      hiddenFields: [],
      advancedFields: [],
      overrideFields: [],
      uiSchema: {
        enabled: {
          "ui:after": { render: "SemanticSearchReindex" },
        },
      },
    },
    global: {
      fieldOrder: ["enabled", "reindex", "model", "model_size", "device"],
      advancedFields: ["reindex", "device"],
    },
  },
  mqtt: {
    base: {
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
      liveValidate: true,
      uiSchema: {},
    },
  },
  ui: {
    base: {
      fieldOrder: ["dashboard", "order"],
      hiddenFields: [],
      advancedFields: [],
      overrideFields: [],
    },
    global: {
      fieldOrder: [
        "timezone",
        "time_format",
        "date_style",
        "time_style",
        "unit_system",
      ],
      advancedFields: [],
    },
  },
  database: {
    base: {
      fieldOrder: ["path"],
      advancedFields: [],
    },
  },
  auth: {
    base: {
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
      hiddenFields: ["admin_first_time_login"],
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
  },
  tls: {
    base: {
      fieldOrder: ["enabled", "cert", "key"],
      advancedFields: [],
    },
  },
  networking: {
    base: {
      fieldOrder: ["ipv6"],
      advancedFields: [],
    },
  },
  proxy: {
    base: {
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
  },
  logger: {
    base: {
      fieldOrder: ["default", "logs"],
      advancedFields: ["logs"],
    },
  },
  environment_vars: {
    base: {
      fieldOrder: [],
      advancedFields: [],
    },
  },
  telemetry: {
    base: {
      fieldOrder: ["network_interfaces", "stats", "version_check"],
      advancedFields: [],
    },
  },
  detectors: {
    base: {
      fieldOrder: [],
      advancedFields: [],
    },
  },
  model: {
    base: {
      fieldOrder: [
        "path",
        "labelmap_path",
        "width",
        "height",
        "input_pixel_format",
        "input_tensor",
        "input_dtype",
        "model_type",
      ],
      advancedFields: [
        "input_pixel_format",
        "input_tensor",
        "input_dtype",
        "model_type",
      ],
      hiddenFields: ["labelmap", "attributes_map"],
    },
  },
  genai: {
    base: {
      fieldOrder: [
        "provider",
        "api_key",
        "base_url",
        "model",
        "provider_options",
        "runtime_options",
      ],
      advancedFields: ["base_url", "provider_options", "runtime_options"],
      hiddenFields: ["genai.enabled_in_config"],
    },
  },
  classification: {
    base: {
      hiddenFields: ["custom"],
      advancedFields: [],
    },
  },
};

const mergeSectionConfig = (
  base: SectionConfig | undefined,
  overrides: Partial<SectionConfig> | undefined,
): SectionConfig =>
  mergeWith({}, base ?? {}, overrides ?? {}, (objValue, srcValue, key) => {
    if (Array.isArray(objValue) || Array.isArray(srcValue)) {
      return srcValue ?? objValue;
    }

    if (key === "uiSchema" && srcValue !== undefined) {
      return srcValue;
    }

    return undefined;
  });

export function getSectionConfig(
  sectionKey: string,
  level: "global" | "camera",
): SectionConfig {
  const entry = sectionConfigs[sectionKey];
  if (!entry) {
    return {};
  }

  const overrides = level === "global" ? entry.global : entry.camera;
  return mergeSectionConfig(entry.base, overrides);
}
