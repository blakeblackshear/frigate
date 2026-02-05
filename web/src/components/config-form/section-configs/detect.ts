import type { SectionConfigOverrides } from "./types";

const detect: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/camera_specific",
    restartRequired: [],
    // use the grid for field order
    // fieldOrder: [
    //   "enabled",
    //   "width",
    //   "height",
    //   "fps",
    //   "min_initialized",
    //   "max_disappeared",
    //   "annotation_offset",
    //   "stationary",
    // ],
    fieldGroups: {
      resolution: ["width", "height", "fps"],
      tracking: ["min_initialized", "max_disappeared"],
    },
    hiddenFields: ["enabled_in_config"],
    advancedFields: [
      "min_initialized",
      "max_disappeared",
      "annotation_offset",
      "stationary",
    ],
    uiSchema: {
      "ui:field": "LayoutGridField",
      "ui:layoutGrid": [
        {
          "ui:row": [{ enabled: { "ui:col": "col-span-12 lg:col-span-4" } }],
        },
        {
          "ui:row": [
            { width: { "ui:col": "col-span-12 md:col-span-4" } },
            { height: { "ui:col": "col-span-12 md:col-span-4" } },
            { fps: { "ui:col": "col-span-12 md:col-span-4" } },
          ],
        },
        {
          "ui:row": [
            { min_initialized: { "ui:col": "col-span-12 md:col-span-6" } },
            { max_disappeared: { "ui:col": "col-span-12 md:col-span-6" } },
          ],
        },
        {
          "ui:row": [
            { annotation_offset: { "ui:col": "col-span-12 md:col-span-3" } },
          ],
        },
        {
          "ui:row": [{ stationary: { "ui:col": "col-span-12 md:col-span-6" } }],
        },
      ],
    },
  },
};

export default detect;
