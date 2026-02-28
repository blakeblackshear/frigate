import { WsFeedMessage } from "@/api/ws";

const EVENT_TOPICS = new Set([
  "events",
  "reviews",
  "tracked_object_update",
  "triggers",
]);

const SYSTEM_TOPICS = new Set([
  "stats",
  "model_state",
  "job_state",
  "embeddings_reindex_progress",
  "audio_transcription_state",
  "birdseye_layout",
]);

export function extractCameraName(message: WsFeedMessage): string | null {
  // Try extracting from topic pattern: {camera}/motion, {camera}/audio/rms, etc.
  const topicParts = message.topic.split("/");
  if (
    topicParts.length >= 2 &&
    !EVENT_TOPICS.has(message.topic) &&
    !SYSTEM_TOPICS.has(message.topic) &&
    message.topic !== "camera_activity" &&
    message.topic !== "audio_detections" &&
    message.topic !== "restart" &&
    message.topic !== "notification_test"
  ) {
    return topicParts[0];
  }

  // Try extracting from payload
  try {
    const data =
      typeof message.payload === "string"
        ? JSON.parse(message.payload)
        : message.payload;

    if (typeof data === "object" && data !== null) {
      if ("camera" in data) return data.camera as string;
      if ("after" in data && data.after?.camera)
        return data.after.camera as string;
      if ("before" in data && data.before?.camera)
        return data.before.camera as string;
    }
  } catch {
    // ignore parse errors
  }

  return null;
}
