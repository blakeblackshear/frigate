import type { SectionConfigOverrides } from "./types";

const detectorHiddenFields = [
  "*.model.labelmap",
  "*.model.attributes_map",
  "*.model",
  "*.model_path",
];

const detectors: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/object_detectors",
    fieldOrder: [],
    advancedFields: [],
    hiddenFields: detectorHiddenFields,
    uiSchema: {
      "ui:field": "DetectorHardwareField",
      "ui:options": {
        multiInstanceTypes: ["cpu", "onnx", "openvino"],
        typeOrder: ["onnx", "openvino", "edgetpu"],
        hiddenByType: {},
        hiddenFields: detectorHiddenFields,
      },
    },
  },
};

export default detectors;
