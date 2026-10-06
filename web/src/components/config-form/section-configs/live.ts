import { isRestreamedStream } from "@/utils/liveTranscode";
import type { SectionConfigOverrides } from "./types";

const live: SectionConfigOverrides = {
  base: {
    sectionDocs: "/configuration/live",
    messages: [
      {
        key: "no-go2rtc-stream",
        health: true,
        messageKey: "configMessages.live.noGo2rtcStream",
        severity: "info",
        docLink: "/configuration/live",
        condition: (ctx) => {
          if (ctx.level !== "camera" || !ctx.fullCameraConfig) return false;
          return !Object.values(ctx.fullCameraConfig.live.streams).some(
            (name) => isRestreamedStream(ctx.fullConfig, name),
          );
        },
      },
    ],
    restartRequired: [],
    fieldOrder: ["streams", "transcode", "height", "quality"],
    fieldGroups: {},
    hiddenFields: ["enabled_in_config"],
    advancedFields: ["height", "quality"],
  },
  global: {
    restartRequired: ["streams", "height", "quality"],
    hiddenFields: ["streams", "transcode"],
  },
  camera: {
    restartRequired: ["height", "quality"],
    orderedMaps: ["streams"],
    uiSchema: {
      streams: {
        "ui:field": "LiveStreamsField",
        "ui:options": {
          label: false,
          suppressDescription: true,
        },
      },
      transcode: {
        "ui:field": "LiveTranscodeField",
        "ui:options": {
          label: false,
          suppressDescription: true,
        },
      },
    },
  },
};

export default live;
