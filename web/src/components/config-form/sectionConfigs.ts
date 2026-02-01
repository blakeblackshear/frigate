/*
  sectionConfigs.ts — section configuration overrides

  Purpose:
  - Centralize UI configuration hints for each config section (field ordering,
    grouping, hidden/advanced fields, uiSchema overrides, and overrideFields).

  Shape:
  - Each section key maps to an object with optional `base`, `global`, and
    `camera` entries where each is a `SectionConfig` (or partial):
      {
        base?: SectionConfig;       // common defaults (typically camera-level)
        global?: Partial<SectionConfig>; // overrides for global-level UI
        camera?: Partial<SectionConfig>; // overrides for camera-level UI
      }
*/

import type { SectionConfigOverrides } from "./section-configs/types";
import audio from "./section-configs/audio";
import audioTranscription from "./section-configs/audio_transcription";
import auth from "./section-configs/auth";
import birdseye from "./section-configs/birdseye";
import classification from "./section-configs/classification";
import database from "./section-configs/database";
import detect from "./section-configs/detect";
import detectors from "./section-configs/detectors";
import environmentVars from "./section-configs/environment_vars";
import faceRecognition from "./section-configs/face_recognition";
import ffmpeg from "./section-configs/ffmpeg";
import genai from "./section-configs/genai";
import live from "./section-configs/live";
import logger from "./section-configs/logger";
import lpr from "./section-configs/lpr";
import model from "./section-configs/model";
import motion from "./section-configs/motion";
import mqtt from "./section-configs/mqtt";
import networking from "./section-configs/networking";
import notifications from "./section-configs/notifications";
import objects from "./section-configs/objects";
import onvif from "./section-configs/onvif";
import proxy from "./section-configs/proxy";
import record from "./section-configs/record";
import review from "./section-configs/review";
import semanticSearch from "./section-configs/semantic_search";
import snapshots from "./section-configs/snapshots";
import telemetry from "./section-configs/telemetry";
import timestampStyle from "./section-configs/timestamp_style";
import tls from "./section-configs/tls";
import ui from "./section-configs/ui";

export const sectionConfigs: Record<string, SectionConfigOverrides> = {
  detect,
  record,
  snapshots,
  motion,
  objects,
  review,
  audio,
  live,
  timestamp_style: timestampStyle,
  notifications,
  onvif,
  ffmpeg,
  audio_transcription: audioTranscription,
  birdseye,
  face_recognition: faceRecognition,
  lpr,
  semantic_search: semanticSearch,
  mqtt,
  ui,
  database,
  auth,
  tls,
  networking,
  proxy,
  logger,
  environment_vars: environmentVars,
  telemetry,
  detectors,
  model,
  genai,
  classification,
};

export type { SectionConfigOverrides } from "./section-configs/types";
