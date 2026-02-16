import type { SectionConfigOverrides } from "./types";

const arrayAsTextWidget = {
  "ui:widget": "ArrayAsTextWidget",
  "ui:options": {
    suppressMultiSchema: true,
  },
};

const ffmpegArgsWidget = (
  presetField: string,
  extraOptions?: Record<string, unknown>,
) => ({
  "ui:widget": "FfmpegArgsWidget",
  "ui:options": {
    suppressMultiSchema: true,
    ffmpegPresetField: presetField,
    ...extraOptions,
  },
});

const ffmpeg: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/ffmpeg_presets",
    fieldDocs: {
      hwaccel_args: "/configuration/ffmpeg_presets#hwaccel-presets",
      "inputs.hwaccel_args": "/configuration/ffmpeg_presets#hwaccel-presets",
      input_args: "/configuration/ffmpeg_presets#input-args-presets",
      "inputs.input_args": "/configuration/ffmpeg_presets#input-args-presets",
      output_args: "/configuration/ffmpeg_presets#output-args-presets",
      "inputs.output_args": "/configuration/ffmpeg_presets#output-args-presets",
      "output_args.record": "/configuration/ffmpeg_presets#output-args-presets",
      "inputs.roles": "/configuration/cameras/#setting-up-camera-inputs",
    },
    restartRequired: [],
    fieldOrder: [
      "inputs",
      "global_args",
      "input_args",
      "hwaccel_args",
      "output_args",
      "path",
      "retry_interval",
      "apple_compatibility",
      "gpu",
    ],
    hiddenFields: [],
    advancedFields: [
      "path",
      "global_args",
      "retry_interval",
      "apple_compatibility",
      "gpu",
    ],
    overrideFields: [
      "inputs",
      "path",
      "global_args",
      "input_args",
      "hwaccel_args",
      "output_args",
      "retry_interval",
      "apple_compatibility",
      "gpu",
    ],
    uiSchema: {
      path: {
        "ui:options": { size: "md" },
      },
      global_args: arrayAsTextWidget,
      hwaccel_args: ffmpegArgsWidget("hwaccel_args"),
      input_args: ffmpegArgsWidget("input_args"),
      output_args: {
        detect: arrayAsTextWidget,
        record: ffmpegArgsWidget("output_args.record"),
        items: {
          detect: arrayAsTextWidget,
          record: ffmpegArgsWidget("output_args.record"),
        },
      },
      inputs: {
        "ui:field": "CameraInputsField",
        items: {
          path: {
            "ui:options": { size: "full" },
          },
          roles: {
            "ui:widget": "inputRoles",
            "ui:options": {
              showArrayItemDescription: true,
            },
          },
          global_args: {
            "ui:widget": "hidden",
          },
          hwaccel_args: ffmpegArgsWidget("hwaccel_args", {
            allowInherit: true,
            hideDescription: true,
            forceSplitLayout: true,
            showArrayItemDescription: true,
          }),
          input_args: ffmpegArgsWidget("input_args", {
            allowInherit: true,
            hideDescription: true,
            forceSplitLayout: true,
            showArrayItemDescription: true,
          }),
          output_args: {
            items: {
              detect: arrayAsTextWidget,
              record: ffmpegArgsWidget("output_args.record"),
            },
          },
        },
      },
    },
  },
  global: {
    restartRequired: [
      "path",
      "global_args",
      "hwaccel_args",
      "input_args",
      "output_args",
      "retry_interval",
      "apple_compatibility",
      "gpu",
    ],
    fieldOrder: [
      "hwaccel_args",
      "path",
      "global_args",
      "input_args",
      "output_args",
      "retry_interval",
      "apple_compatibility",
      "gpu",
    ],
    advancedFields: [
      "global_args",
      "input_args",
      "output_args",
      "path",
      "retry_interval",
      "apple_compatibility",
      "gpu",
    ],
    uiSchema: {
      path: {
        "ui:options": { size: "md" },
      },
      global_args: arrayAsTextWidget,
      hwaccel_args: ffmpegArgsWidget("hwaccel_args"),
      input_args: ffmpegArgsWidget("input_args"),
      output_args: {
        detect: arrayAsTextWidget,
        record: ffmpegArgsWidget("output_args.record"),
      },
    },
  },
  camera: {
    fieldGroups: {
      cameraFfmpeg: ["input_args", "hwaccel_args", "output_args"],
    },
    restartRequired: [
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
  },
};

export default ffmpeg;
