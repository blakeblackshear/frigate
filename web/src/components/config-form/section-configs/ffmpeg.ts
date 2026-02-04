import type { SectionConfigOverrides } from "./types";

const arrayAsTextWidget = {
  "ui:widget": "ArrayAsTextWidget",
  "ui:options": {
    suppressMultiSchema: true,
  },
};

const ffmpegArgsWidget = (presetField: string) => ({
  "ui:widget": "FfmpegArgsWidget",
  "ui:options": {
    suppressMultiSchema: true,
    ffmpegPresetField: presetField,
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
      "output_args.record": "/configuration/ffmpeg_presets#output-args-presets",
    },
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
        items: {
          global_args: arrayAsTextWidget,
          hwaccel_args: ffmpegArgsWidget("hwaccel_args"),
          input_args: ffmpegArgsWidget("input_args"),
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
      global_args: arrayAsTextWidget,
      hwaccel_args: ffmpegArgsWidget("hwaccel_args"),
      input_args: ffmpegArgsWidget("input_args"),
      output_args: {
        detect: arrayAsTextWidget,
        record: ffmpegArgsWidget("output_args.record"),
      },
    },
  },
};

export default ffmpeg;
