import type { SectionConfigOverrides } from "./types";

const model: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/object_detectors#model",
    restartRequired: [],
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
