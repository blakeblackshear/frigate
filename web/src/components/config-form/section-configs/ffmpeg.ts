import type { SectionConfigOverrides } from "./types";

const ffmpeg: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/ffmpeg_presets",
    restartRequired: [],
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
};

export default ffmpeg;
