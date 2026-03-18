import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  EmbeddingsReindexProgressType,
  FrigateCameraState,
  FrigateEvent,
  FrigateReview,
  ModelState,
  ToggleableSetting,
  TrackedObjectUpdateReturnType,
  TriggerStatus,
  FrigateAudioDetections,
  Job,
} from "@/types/ws";
import { FrigateStats } from "@/types/stats";
import { isEqual } from "lodash";
import { WsSendContext } from "./wsContext";
import type { Update, WsSend } from "./wsContext";

export type { Update };

export type WsFeedMessage = {
  topic: string;
  payload: unknown;
  timestamp: number;
  id: string;
};

type WsState = {
  [topic: string]: unknown;
};

// External store for WebSocket state using useSyncExternalStore
type Listener = () => void;

const wsState: WsState = {};
const wsTopicListeners = new Map<string, Set<Listener>>();

// Reset all module-level state. Called on WsProvider unmount to prevent
// stale data from leaking across mount/unmount cycles (e.g. HMR, logout)
export function resetWsStore() {
  for (const key of Object.keys(wsState)) {
    delete wsState[key];
  }
  wsTopicListeners.clear();
  lastCameraActivityPayload = null;
  wsMessageSubscribers.clear();
  wsMessageIdCounter = 0;
}

// Parse and apply a raw WS message synchronously.
// Called directly from WsProvider's onmessage handler.
export function processWsMessage(raw: string) {
  const data: Update = JSON.parse(raw);
  if (!data) return;

  const { topic, payload } = data;

  if (topic === "camera_activity") {
    applyCameraActivity(payload as string);
  } else {
    applyTopicUpdate(topic, payload);
  }

  if (wsMessageSubscribers.size > 0) {
    wsMessageSubscribers.forEach((cb) =>
      cb({
        topic,
        payload,
        timestamp: Date.now(),
        id: String(wsMessageIdCounter++),
      }),
    );
  }
}

function applyTopicUpdate(topic: string, newVal: unknown) {
  const oldVal = wsState[topic];
  // Fast path: === for primitives ("ON"/"OFF", numbers).
  // Fall back to isEqual for objects/arrays.
  const unchanged =
    oldVal === newVal ||
    (typeof newVal === "object" && newVal !== null && isEqual(oldVal, newVal));
  if (unchanged) return;

  wsState[topic] = newVal;
  // Snapshot the Set — a listener may trigger unmount that modifies it.
  const listeners = wsTopicListeners.get(topic);
  if (listeners) {
    for (const l of Array.from(listeners)) l();
  }
}

// Subscriptions

export function subscribeWsTopic(
  topic: string,
  listener: Listener,
): () => void {
  let set = wsTopicListeners.get(topic);
  if (!set) {
    set = new Set();
    wsTopicListeners.set(topic, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) wsTopicListeners.delete(topic);
  };
}

export function getWsTopicValue(topic: string): unknown {
  return wsState[topic];
}

// Feed message subscribers
const wsMessageSubscribers = new Set<(msg: WsFeedMessage) => void>();
let wsMessageIdCounter = 0;

// Camera activity expansion
//
// Cache the last raw camera_activity JSON string so we can skip JSON.parse
// and the entire expansion when nothing has changed. This avoids creating
// fresh objects (which defeat Object.is and force expensive isEqual deep
// traversals) on every flush — critical with many cameras.
let lastCameraActivityPayload: string | null = null;

function applyCameraActivity(payload: string) {
  // Fast path: if the raw JSON string is identical, nothing changed.
  if (payload === lastCameraActivityPayload) return;
  lastCameraActivityPayload = payload;

  let activity: { [key: string]: Partial<FrigateCameraState> };

  try {
    activity = JSON.parse(payload);
  } catch {
    return;
  }

  if (Object.keys(activity).length === 0) return;

  for (const [name, state] of Object.entries(activity)) {
    applyTopicUpdate(`camera_activity/${name}`, state);

    // Sync motion state so {camera}/motion topic stays up-to-date with
    // camera_activity and doesn't remain stale from a retained MQTT value.
    if (state.motion !== undefined) {
      applyTopicUpdate(`${name}/motion`, state.motion ? "ON" : "OFF");
    }

    const cameraConfig = state?.config;
    if (!cameraConfig) continue;

    const {
      record,
      detect,
      enabled,
      snapshots,
      audio,
      audio_transcription,
      notifications,
      notifications_suspended,
      autotracking,
      alerts,
      detections,
      object_descriptions,
      review_descriptions,
    } = cameraConfig;

    applyTopicUpdate(`${name}/recordings/state`, record ? "ON" : "OFF");
    applyTopicUpdate(`${name}/enabled/state`, enabled ? "ON" : "OFF");
    applyTopicUpdate(`${name}/detect/state`, detect ? "ON" : "OFF");
    applyTopicUpdate(`${name}/snapshots/state`, snapshots ? "ON" : "OFF");
    applyTopicUpdate(`${name}/audio/state`, audio ? "ON" : "OFF");
    applyTopicUpdate(
      `${name}/audio_transcription/state`,
      audio_transcription ? "ON" : "OFF",
    );
    applyTopicUpdate(
      `${name}/notifications/state`,
      notifications ? "ON" : "OFF",
    );
    applyTopicUpdate(
      `${name}/notifications/suspended`,
      notifications_suspended || 0,
    );
    applyTopicUpdate(
      `${name}/ptz_autotracker/state`,
      autotracking ? "ON" : "OFF",
    );
    applyTopicUpdate(`${name}/review_alerts/state`, alerts ? "ON" : "OFF");
    applyTopicUpdate(
      `${name}/review_detections/state`,
      detections ? "ON" : "OFF",
    );
    applyTopicUpdate(
      `${name}/object_descriptions/state`,
      object_descriptions ? "ON" : "OFF",
    );
    applyTopicUpdate(
      `${name}/review_descriptions/state`,
      review_descriptions ? "ON" : "OFF",
    );
  }
}

// Hooks
export function useWsUpdate(): WsSend {
  const send = useContext(WsSendContext);
  if (!send) {
    throw new Error("useWsUpdate must be used within WsProvider");
  }
  return send;
}

// Subscribe to a single WS topic with proper bail-out.
// Only re-renders when the topic's value changes (Object.is comparison).
// Uses useSyncExternalStore — zero useEffect, so no PassiveMask flags
// propagate through the fiber tree.
export function useWs(watchTopic: string, publishTopic: string) {
  const payload = useSyncExternalStore(
    useCallback(
      (listener: Listener) => subscribeWsTopic(watchTopic, listener),
      [watchTopic],
    ),
    useCallback(() => wsState[watchTopic], [watchTopic]),
  );

  const sendJsonMessage = useWsUpdate();

  const value = { payload: payload ?? null };

  const send = useCallback(
    (payload: unknown, retain = false) => {
      sendJsonMessage({
        topic: publishTopic || watchTopic,
        payload,
        retain,
      });
    },
    [sendJsonMessage, watchTopic, publishTopic],
  );

  return { value, send };
}

// Convenience hooks

export function useEnabledState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/enabled/state`, `${camera}/enabled/set`);
  return { payload: payload as ToggleableSetting, send };
}

export function useDetectState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/detect/state`, `${camera}/detect/set`);
  return { payload: payload as ToggleableSetting, send };
}

export function useRecordingsState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/recordings/state`, `${camera}/recordings/set`);
  return { payload: payload as ToggleableSetting, send };
}

export function useSnapshotsState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/snapshots/state`, `${camera}/snapshots/set`);
  return { payload: payload as ToggleableSetting, send };
}

export function useAudioState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/audio/state`, `${camera}/audio/set`);
  return { payload: payload as ToggleableSetting, send };
}

export function useAudioTranscriptionState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/audio_transcription/state`,
    `${camera}/audio_transcription/set`,
  );
  return { payload: payload as ToggleableSetting, send };
}

export function useAutotrackingState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/ptz_autotracker/state`, `${camera}/ptz_autotracker/set`);
  return { payload: payload as ToggleableSetting, send };
}

export function useAlertsState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/review_alerts/state`, `${camera}/review_alerts/set`);
  return { payload: payload as ToggleableSetting, send };
}

export function useDetectionsState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/review_detections/state`,
    `${camera}/review_detections/set`,
  );
  return { payload: payload as ToggleableSetting, send };
}

export function useObjectDescriptionState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/object_descriptions/state`,
    `${camera}/object_descriptions/set`,
  );
  return { payload: payload as ToggleableSetting, send };
}

export function useReviewDescriptionState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/review_descriptions/state`,
    `${camera}/review_descriptions/set`,
  );
  return { payload: payload as ToggleableSetting, send };
}

export function useMotionMaskState(
  camera: string,
  maskName: string,
): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/motion_mask/${maskName}/state`,
    `${camera}/motion_mask/${maskName}/set`,
  );
  return { payload: payload as ToggleableSetting, send };
}

export function useObjectMaskState(
  camera: string,
  maskName: string,
): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/object_mask/${maskName}/state`,
    `${camera}/object_mask/${maskName}/set`,
  );
  return { payload: payload as ToggleableSetting, send };
}

export function useZoneState(
  camera: string,
  zoneName: string,
): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/zone/${zoneName}/state`,
    `${camera}/zone/${zoneName}/set`,
  );
  return { payload: payload as ToggleableSetting, send };
}

export function usePtzCommand(camera: string): {
  payload: string;
  send: (payload: string, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/ptz`, `${camera}/ptz`);
  return { payload: payload as string, send };
}

export function useRestart(): {
  payload: string;
  send: (payload: string, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs("restart", "restart");
  return { payload: payload as string, send };
}

export function useFrigateEvents(): { payload: FrigateEvent } {
  const {
    value: { payload },
  } = useWs("events", "");
  const parsed = useMemo(
    () => (payload ? JSON.parse(payload as string) : undefined),
    [payload],
  );
  return { payload: parsed };
}

export function useAudioDetections(): { payload: FrigateAudioDetections } {
  const {
    value: { payload },
  } = useWs("audio_detections", "");
  const parsed = useMemo(
    () => (payload ? JSON.parse(payload as string) : undefined),
    [payload],
  );
  return { payload: parsed };
}

export function useFrigateReviews(): FrigateReview {
  const {
    value: { payload },
  } = useWs("reviews", "");
  return useMemo(
    () => (payload ? JSON.parse(payload as string) : undefined),
    [payload],
  );
}

export function useFrigateStats(): FrigateStats {
  const {
    value: { payload },
  } = useWs("stats", "");
  return useMemo(
    () => (payload ? JSON.parse(payload as string) : undefined),
    [payload],
  );
}

export function useInitialCameraState(
  camera: string,
  revalidateOnFocus: boolean,
): {
  payload: FrigateCameraState;
} {
  const {
    value: { payload },
    send: sendCommand,
  } = useWs(`camera_activity/${camera}`, "onConnect");

  // camera_activity sub-topic payload is already parsed by expandCameraActivity
  const data = payload as FrigateCameraState | undefined;

  // onConnect is sent once in WsProvider.onopen — no need to re-request on
  // every component mount.  Components read cached wsState immediately via
  // useSyncExternalStore.  Only re-request when the user tabs back in.
  useEffect(() => {
    if (!revalidateOnFocus) return;

    const listener = () => {
      if (document.visibilityState === "visible") {
        sendCommand("onConnect");
      }
    };
    addEventListener("visibilitychange", listener);

    return () => {
      removeEventListener("visibilitychange", listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revalidateOnFocus]);

  return { payload: data as FrigateCameraState };
}

export function useModelState(
  model: string,
  revalidateOnFocus: boolean = true,
): { payload: ModelState } {
  const {
    value: { payload },
    send: sendCommand,
  } = useWs("model_state", "modelState");

  const data = useMemo(
    () => (payload ? JSON.parse(payload as string) : undefined),
    [payload],
  );

  useEffect(() => {
    let listener = undefined;
    if (revalidateOnFocus) {
      sendCommand("modelState");
      listener = () => {
        if (document.visibilityState == "visible") {
          sendCommand("modelState");
        }
      };
      addEventListener("visibilitychange", listener);
    }

    return () => {
      if (listener) {
        removeEventListener("visibilitychange", listener);
      }
    };
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revalidateOnFocus]);

  return { payload: data ? data[model] : undefined };
}

export function useEmbeddingsReindexProgress(
  revalidateOnFocus: boolean = true,
): {
  payload: EmbeddingsReindexProgressType;
} {
  const {
    value: { payload },
    send: sendCommand,
  } = useWs("embeddings_reindex_progress", "embeddingsReindexProgress");

  const data = useMemo(
    () => (payload ? JSON.parse(payload as string) : undefined),
    [payload],
  );

  useEffect(() => {
    let listener = undefined;
    if (revalidateOnFocus) {
      sendCommand("embeddingsReindexProgress");
      listener = () => {
        if (document.visibilityState == "visible") {
          sendCommand("embeddingsReindexProgress");
        }
      };
      addEventListener("visibilitychange", listener);
    }

    return () => {
      if (listener) {
        removeEventListener("visibilitychange", listener);
      }
    };
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revalidateOnFocus]);

  return { payload: data };
}

export function useAudioTranscriptionProcessState(
  revalidateOnFocus: boolean = true,
): { payload: string } {
  const {
    value: { payload },
    send: sendCommand,
  } = useWs("audio_transcription_state", "audioTranscriptionState");

  const data = useMemo(
    () => (payload ? (JSON.parse(payload as string) as string) : "idle"),
    [payload],
  );

  useEffect(() => {
    let listener = undefined;
    if (revalidateOnFocus) {
      sendCommand("audioTranscriptionState");
      listener = () => {
        if (document.visibilityState == "visible") {
          sendCommand("audioTranscriptionState");
        }
      };
      addEventListener("visibilitychange", listener);
    }
    return () => {
      if (listener) {
        removeEventListener("visibilitychange", listener);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revalidateOnFocus]);

  return { payload: data || "idle" };
}

export function useBirdseyeLayout(revalidateOnFocus: boolean = true): {
  payload: string;
} {
  const {
    value: { payload },
    send: sendCommand,
  } = useWs("birdseye_layout", "birdseyeLayout");

  const data = useMemo(
    () => (payload ? JSON.parse(payload as string) : undefined),
    [payload],
  );

  useEffect(() => {
    let listener = undefined;
    if (revalidateOnFocus) {
      sendCommand("birdseyeLayout");
      listener = () => {
        if (document.visibilityState == "visible") {
          sendCommand("birdseyeLayout");
        }
      };
      addEventListener("visibilitychange", listener);
    }

    return () => {
      if (listener) {
        removeEventListener("visibilitychange", listener);
      }
    };
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revalidateOnFocus]);

  return { payload: data };
}

export function useMotionActivity(camera: string): { payload: string } {
  const {
    value: { payload },
  } = useWs(`${camera}/motion`, "");
  return { payload: payload as string };
}

export function useAudioActivity(camera: string): { payload: number } {
  const {
    value: { payload },
  } = useWs(`${camera}/audio/rms`, "");
  return { payload: payload as number };
}

export function useAudioLiveTranscription(camera: string): {
  payload: string;
} {
  const {
    value: { payload },
  } = useWs(`${camera}/audio/transcription`, "");
  return { payload: payload as string };
}

export function useMotionThreshold(camera: string): {
  payload: string;
  send: (payload: number, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/motion_threshold/state`,
    `${camera}/motion_threshold/set`,
  );
  return { payload: payload as string, send };
}

export function useMotionContourArea(camera: string): {
  payload: string;
  send: (payload: number, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/motion_contour_area/state`,
    `${camera}/motion_contour_area/set`,
  );
  return { payload: payload as string, send };
}

export function useImproveContrast(camera: string): {
  payload: ToggleableSetting;
  send: (payload: string, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/improve_contrast/state`,
    `${camera}/improve_contrast/set`,
  );
  return { payload: payload as ToggleableSetting, send };
}

export function useTrackedObjectUpdate(): {
  payload: TrackedObjectUpdateReturnType;
} {
  const {
    value: { payload },
  } = useWs("tracked_object_update", "");
  const parsed = useMemo(
    () =>
      payload
        ? JSON.parse(payload as string)
        : { type: "", id: "", camera: "" },
    [payload],
  );
  return { payload: parsed };
}

export function useNotifications(camera: string): {
  payload: ToggleableSetting;
  send: (payload: string, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/notifications/state`, `${camera}/notifications/set`);
  return { payload: payload as ToggleableSetting, send };
}

export function useNotificationSuspend(camera: string): {
  payload: string;
  send: (payload: number, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/notifications/suspended`,
    `${camera}/notifications/suspend`,
  );
  return { payload: payload as string, send };
}

export function useNotificationTest(): {
  payload: string;
  send: (payload: string, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs("notification_test", "notification_test");
  return { payload: payload as string, send };
}

export function useTriggers(): { payload: TriggerStatus } {
  const {
    value: { payload },
  } = useWs("triggers", "");
  const parsed = useMemo(
    () =>
      payload
        ? JSON.parse(payload as string)
        : { name: "", camera: "", event_id: "", type: "", score: 0 },
    [payload],
  );
  return { payload: parsed };
}

export function useJobStatus(
  jobType: string,
  revalidateOnFocus: boolean = true,
): { payload: Job | null } {
  const {
    value: { payload },
    send: sendCommand,
  } = useWs("job_state", "jobState");

  const jobData = useMemo(
    () => (payload && typeof payload === "string" ? JSON.parse(payload) : {}),
    [payload],
  );
  const currentJob = jobData[jobType] || null;

  useEffect(() => {
    let listener: (() => void) | undefined;
    if (revalidateOnFocus) {
      sendCommand("jobState");
      listener = () => {
        if (document.visibilityState === "visible") {
          sendCommand("jobState");
        }
      };
      addEventListener("visibilitychange", listener);
    }

    return () => {
      if (listener) {
        removeEventListener("visibilitychange", listener);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revalidateOnFocus]);

  return { payload: currentJob as Job | null };
}

export function useWsMessageSubscribe(callback: (msg: WsFeedMessage) => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = (msg: WsFeedMessage) => callbackRef.current(msg);
    wsMessageSubscribers.add(handler);
    return () => {
      wsMessageSubscribers.delete(handler);
    };
  }, []);
}
