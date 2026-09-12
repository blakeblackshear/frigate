/**
 * Camera activity WebSocket payload factory.
 *
 * The camera_activity topic payload is double-serialized:
 * the WS message contains { topic: "camera_activity", payload: JSON.stringify(activityMap) }
 */

export interface CameraActivityState {
  config: {
    enabled: boolean;
    detect: boolean;
    record: boolean;
    snapshots: boolean;
    audio: boolean;
    audio_transcription: boolean;
    notifications: boolean;
    notifications_suspended: number;
    autotracking: boolean;
    alerts: boolean;
    detections: boolean;
    object_descriptions: boolean;
    review_descriptions: boolean;
  };
  motion: boolean;
  objects: Array<{
    label: string;
    score: number;
    box: [number, number, number, number];
    area: number;
    ratio: number;
    region: [number, number, number, number];
    current_zones: string[];
    id: string;
  }>;
  audio_detections: Array<{
    label: string;
    score: number;
  }>;
}

function defaultCameraActivity(): CameraActivityState {
  return {
    config: {
      enabled: true,
      detect: true,
      record: true,
      snapshots: true,
      audio: false,
      audio_transcription: false,
      notifications: false,
      notifications_suspended: 0,
      autotracking: false,
      alerts: true,
      detections: true,
      object_descriptions: false,
      review_descriptions: false,
    },
    motion: false,
    objects: [],
    audio_detections: [],
  };
}

export function cameraActivityPayload(
  cameras: string[],
  overrides?: Partial<Record<string, Partial<CameraActivityState>>>,
): string {
  const activity: Record<string, CameraActivityState> = {};
  for (const name of cameras) {
    activity[name] = {
      ...defaultCameraActivity(),
      ...overrides?.[name],
    } as CameraActivityState;
  }
  // Double-serialize: the WS payload is a JSON string
  return JSON.stringify(activity);
}
