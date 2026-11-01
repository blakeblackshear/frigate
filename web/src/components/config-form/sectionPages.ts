/** settings page id that edits each config section at camera level */
export const CAMERA_PAGE_BY_SECTION: Record<string, string> = {
  detect: "cameraDetect",
  ffmpeg: "cameraFfmpeg",
  record: "cameraRecording",
  snapshots: "cameraSnapshots",
  motion: "cameraMotion",
  objects: "cameraObjects",
  review: "cameraReview",
  audio: "cameraAudioEvents",
  audio_transcription: "cameraAudioTranscription",
  notifications: "cameraNotifications",
  live: "cameraLivePlayback",
  birdseye: "cameraBirdseye",
  face_recognition: "cameraFaceRecognition",
  lpr: "cameraLpr",
  timestamp_style: "cameraTimestampStyle",
  onvif: "cameraOnvif",
};

/** settings page id that edits each config section at global level */
export const GLOBAL_PAGE_BY_SECTION: Record<string, string> = {
  detect: "globalDetect",
  record: "globalRecording",
  snapshots: "globalSnapshots",
  ffmpeg: "globalFfmpeg",
  motion: "globalMotion",
  objects: "globalObjects",
  review: "globalReview",
  audio: "globalAudioEvents",
  live: "globalLivePlayback",
  timestamp_style: "globalTimestampStyle",
  database: "systemDatabase",
  tls: "systemTls",
  auth: "systemAuthentication",
  networking: "systemNetworking",
  proxy: "systemProxy",
  ui: "systemUi",
  logger: "systemLogging",
  environment_vars: "systemEnvironmentVariables",
  telemetry: "systemTelemetry",
  birdseye: "systemBirdseye",
  models: "systemDetectorsAndModel",
  mqtt: "systemMqtt",
  semantic_search: "integrationSemanticSearch",
  genai: "integrationGenerativeAi",
  face_recognition: "integrationFaceRecognition",
  lpr: "integrationLpr",
  classification: "integrationObjectClassification",
  audio_transcription: "integrationAudioTranscription",
};

export function settingsLink(
  section: string,
  level: "global" | "camera",
  cameraName?: string,
): string | undefined {
  if (level === "camera") {
    const page = CAMERA_PAGE_BY_SECTION[section];
    return page && cameraName
      ? `/settings?page=${page}&camera=${encodeURIComponent(cameraName)}`
      : undefined;
  }

  const page = GLOBAL_PAGE_BY_SECTION[section];
  return page ? `/settings?page=${page}` : undefined;
}
