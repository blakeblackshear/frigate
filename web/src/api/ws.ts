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

// ---------------------------------------------------------------------------
// External store for WebSocket state using useSyncExternalStore
//
// Per-topic subscriptions ensure only subscribers of a changed topic are
// notified, avoiding O(messages × total_subscribers) snapshot checks.
//
// Updates are batched via requestAnimationFrame so a burst of WS messages
// (e.g. on initial connect) results in a single React render pass.
// ---------------------------------------------------------------------------

type Listener = () => void;

const wsState: WsState = {};
const wsTopicListeners = new Map<string, Set<Listener>>();

// --- rAF drain + flush ---
//
// The onmessage handler in WsProvider pushes raw event.data strings into
// rawMessageBuffer (sub-microsecond cost). A single requestAnimationFrame
// callback drains the buffer, JSON-parses each message, applies state updates,
// and notifies React subscribers — all in one burst per frame. This gives
// React uninterrupted CPU time between frames.

const rawMessageBuffer: string[] = [];
let pendingUpdates: Record<string, unknown> | null = null;
let pendingFeedMessages: WsFeedMessage[] = [];
let flushScheduled = false;

/**
 * Reset all module-level state. Called on WsProvider unmount to prevent
 * stale data from leaking across mount/unmount cycles (e.g. HMR, logout).
 */
export function resetWsStore() {
  for (const key of Object.keys(wsState)) {
    delete wsState[key];
  }
  wsTopicListeners.clear();
  rawMessageBuffer.length = 0;
  pendingUpdates = null;
  pendingFeedMessages = [];
  flushScheduled = false;
  lastCameraActivityPayload = null;
  wsMessageSubscribers.clear();
  wsMessageIdCounter = 0;
}

export function bufferRawMessage(data: string) {
  rawMessageBuffer.push(data);
  if (!flushScheduled) {
    flushScheduled = true;
    requestAnimationFrame(drainAndFlush);
  }
}

function drainAndFlush() {
  flushScheduled = false;

  // 1. Drain raw buffer → ingest messages
  if (rawMessageBuffer.length > 0) {
    const batch = rawMessageBuffer.splice(0);
    for (const raw of batch) {
      const data: Update = JSON.parse(raw);
      if (data) {
        ingestMessage(data);
      }
    }
  }

  // 2. Flush state updates to React
  if (pendingUpdates) {
    const updates = pendingUpdates;
    pendingUpdates = null;

    for (const [topic, newVal] of Object.entries(updates)) {
      const oldVal = wsState[topic];
      // Fast path: === for primitives ("ON"/"OFF", numbers).
      // Fall back to isEqual for objects/arrays.
      const unchanged =
        oldVal === newVal ||
        (typeof newVal === "object" &&
          newVal !== null &&
          isEqual(oldVal, newVal));
      if (!unchanged) {
        wsState[topic] = newVal;
        // Snapshot the Set — a listener may trigger unmount that modifies it.
        const listeners = wsTopicListeners.get(topic);
        if (listeners) {
          for (const l of Array.from(listeners)) l();
        }
      }
    }
  }

  // 3. Deliver feed messages
  if (pendingFeedMessages.length > 0 && wsMessageSubscribers.size > 0) {
    const msgs = pendingFeedMessages;
    pendingFeedMessages = [];
    for (const msg of msgs) {
      wsMessageSubscribers.forEach((cb) => cb(msg));
    }
  } else {
    pendingFeedMessages = [];
  }
}

function ingestMessage(data: Update) {
  if (!pendingUpdates) pendingUpdates = {};
  pendingUpdates[data.topic] = data.payload;

  if (data.topic === "camera_activity") {
    expandCameraActivity(data.payload as string, pendingUpdates);
  }

  if (wsMessageSubscribers.size > 0) {
    pendingFeedMessages.push({
      topic: data.topic,
      payload: data.payload,
      timestamp: Date.now(),
      id: String(wsMessageIdCounter++),
    });
  }
}

// --- Subscriptions ---

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

// ---------------------------------------------------------------------------
// Feed message subscribers
// ---------------------------------------------------------------------------

const wsMessageSubscribers = new Set<(msg: WsFeedMessage) => void>();
let wsMessageIdCounter = 0;

// ---------------------------------------------------------------------------
// Camera activity expansion
// ---------------------------------------------------------------------------

// Cache the last raw camera_activity JSON string so we can skip JSON.parse
// and the entire expansion when nothing has changed. This avoids creating
// fresh objects (which defeat Object.is and force expensive isEqual deep
// traversals) on every flush — critical with many cameras.
let lastCameraActivityPayload: string | null = null;

function expandCameraActivity(
  payload: string,
  updates: Record<string, unknown>,
) {
  // Fast path: if the raw JSON string is identical, nothing changed.
  if (payload === lastCameraActivityPayload) {
    // Remove camera_activity from pending updates so flushPendingUpdates
    // doesn't run isEqual on a freshly-parsed object that's identical.
    delete updates["camera_activity"];
    return;
  }
  lastCameraActivityPayload = payload;

  let activity: { [key: string]: Partial<FrigateCameraState> };

  try {
    activity = JSON.parse(payload);
  } catch {
    return;
  }

  // Remove the root topic — no component reads the monolithic object.
  // Only per-camera subtopics and per-setting primitives are stored.
  delete updates["camera_activity"];

  if (Object.keys(activity).length === 0) return;

  for (const [name, state] of Object.entries(activity)) {
    // Notify per-camera subtopic specifically
    updates[`camera_activity/${name}`] = state;

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

    updates[`${name}/recordings/state`] = record ? "ON" : "OFF";
    updates[`${name}/enabled/state`] = enabled ? "ON" : "OFF";
    updates[`${name}/detect/state`] = detect ? "ON" : "OFF";
    updates[`${name}/snapshots/state`] = snapshots ? "ON" : "OFF";
    updates[`${name}/audio/state`] = audio ? "ON" : "OFF";
    updates[`${name}/audio_transcription/state`] = audio_transcription
      ? "ON"
      : "OFF";
    updates[`${name}/notifications/state`] = notifications ? "ON" : "OFF";
    updates[`${name}/notifications/suspended`] = notifications_suspended || 0;
    updates[`${name}/ptz_autotracker/state`] = autotracking ? "ON" : "OFF";
    updates[`${name}/review_alerts/state`] = alerts ? "ON" : "OFF";
    updates[`${name}/review_detections/state`] = detections ? "ON" : "OFF";
    updates[`${name}/object_descriptions/state`] = object_descriptions
      ? "ON"
      : "OFF";
    updates[`${name}/review_descriptions/state`] = review_descriptions
      ? "ON"
      : "OFF";
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Get the send function for publishing WS messages.
 */
export function useWsUpdate(): WsSend {
  const send = useContext(WsSendContext);
  if (!send) {
    throw new Error("useWsUpdate must be used within WsProvider");
  }
  return send;
}

/**
 * Subscribe to a single WS topic with proper bail-out.
 * Only re-renders when the topic's value changes (Object.is comparison).
 * Uses useSyncExternalStore — zero useEffect, so no PassiveMask flags
 * propagate through the fiber tree.
 */
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

// ---------------------------------------------------------------------------
// Convenience hooks
// ---------------------------------------------------------------------------

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
    sendCommand("onConnect");
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
