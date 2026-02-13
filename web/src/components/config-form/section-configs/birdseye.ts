import type { SectionConfigOverrides } from "./types";

const birdseye: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/birdseye",
    restartRequired: [],
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
    uiSchema: {
      mode: {
        "ui:size": "xs",
      },
    },
  },
};

export default birdseye;
