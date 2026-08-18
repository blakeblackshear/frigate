import type { SectionConfigOverrides } from "./types";

// scene and devices are rendered by ModelsField itself; the rest of each model
// is delegated back to the schema form
const modelFields = [
  "path",
  "labelmap_path",
  "width",
  "height",
  "input_pixel_format",
  "input_tensor",
  "input_dtype",
  "model_type",
];

const models: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/object_detectors",
    // the default-model rule must be enforced as the list is edited, not
    // only when the form is submitted
    liveValidate: true,
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
    // every model field takes effect only when the detection processes restart
    restartRequired: [
      "scene",
      "devices",
      ...modelFields,
      "labelmap",
      "attributes_map",
    ].map((field) => `*.${field}`),
    hiddenFields: [
      "*.labelmap",
      "*.attributes_map",
      "*.colormap",
      "*.all_attributes",
      "*.non_logo_attributes",
      "*.plus",
    ],
    uiSchema: {
      "ui:field": "ModelsField",
      items: {
        path: {
          "ui:options": { size: "md" },
        },
        labelmap_path: {
          "ui:options": { size: "md" },
        },
        input_pixel_format: {
          "ui:options": { advanced: true },
        },
        input_tensor: {
          "ui:options": { advanced: true },
        },
        input_dtype: {
          "ui:options": { advanced: true },
        },
        model_type: {
          "ui:options": { advanced: true },
        },
      },
    },
  },
};

export default models;
