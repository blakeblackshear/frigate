import type { SectionConfigOverrides } from "./types";

const model: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/object_detectors#model",
    fieldMessages: [
      {
        key: "model-optimized-for-320",
        field: "width",
        position: "before",
        messageKey: "configMessages.model.optimizedFor320",
        severity: "info",
        docLink: "/configuration/object_detectors#choosing-a-model-size",
        condition: (ctx) => {
          const width = ctx.formData?.width as number | null | undefined;
          const height = ctx.formData?.height as number | null | undefined;
          return width === 640 || height === 640;
        },
      },
      {
        key: "model-input-dimensions-not-detect-resolution",
        field: "height",
        position: "after",
        messageKey: "configMessages.model.inputDimensionsNotDetectResolution",
        severity: "warning",
        condition: (ctx) => {
          const width = ctx.formData?.width as number | null | undefined;
          const height = ctx.formData?.height as number | null | undefined;
          if (typeof width !== "number" || typeof height !== "number") {
            return false;
          }
          if (width <= 0 || height <= 0) {
            return false;
          }
          return width > 640 || height > 640;
        },
      },
    ],
    restartRequired: [
      "path",
      "labelmap_path",
      "width",
      "height",
      "labelmap",
      "attributes_map",
      "input_tensor",
      "input_pixel_format",
      "input_dtype",
      "model_type",
    ],
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
    hiddenFields: [
      "labelmap",
      "attributes_map",
      "colormap",
      "all_attributes",
      "non_logo_attributes",
      "plus",
    ],
    uiSchema: {
      path: {
        "ui:options": { size: "md" },
      },
      labelmap_path: {
        "ui:options": { size: "md" },
      },
    },
  },
};

export default model;
