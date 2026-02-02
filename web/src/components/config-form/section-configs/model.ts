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
    hiddenFields: ["labelmap", "attributes_map"],
  },
};

export default model;
