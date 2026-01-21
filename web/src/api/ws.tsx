import { baseUrl } from "./baseUrl";
import { useCallback, useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
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
import { createContainer } from "react-tracked";
import useDeepMemo from "@/hooks/use-deep-memo";

type Update = {
  topic: string;
  payload: unknown;
  retain: boolean;
};

type WsState = {
  [topic: string]: unknown;
};

type useValueReturn = [WsState, (update: Update) => void];

function useValue(): useValueReturn {
  const wsUrl = `${baseUrl.replace(/^http/, "ws")}ws`;

  // main state

  const [wsState, setWsState] = useState<WsState>({});

  useEffect(() => {
    const activityValue: string = wsState["camera_activity"] as string;

    if (!activityValue) {
      return;
    }

    const cameraActivity: { [key: string]: FrigateCameraState } =
      JSON.parse(activityValue);

    if (Object.keys(cameraActivity).length === 0) {
      return;
    }

    const cameraStates: WsState = {};

    Object.entries(cameraActivity).forEach(([name, state]) => {
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
      } = state["config"];
      cameraStates[`${name}/recordings/state`] = record ? "ON" : "OFF";
      cameraStates[`${name}/enabled/state`] = enabled ? "ON" : "OFF";
      cameraStates[`${name}/detect/state`] = detect ? "ON" : "OFF";
      cameraStates[`${name}/snapshots/state`] = snapshots ? "ON" : "OFF";
      cameraStates[`${name}/audio/state`] = audio ? "ON" : "OFF";
      cameraStates[`${name}/audio_transcription/state`] = audio_transcription
        ? "ON"
        : "OFF";
      cameraStates[`${name}/notifications/state`] = notifications
        ? "ON"
        : "OFF";
      cameraStates[`${name}/notifications/suspended`] =
        notifications_suspended || 0;
      cameraStates[`${name}/ptz_autotracker/state`] = autotracking
        ? "ON"
        : "OFF";
      cameraStates[`${name}/review_alerts/state`] = alerts ? "ON" : "OFF";
      cameraStates[`${name}/review_detections/state`] = detections
        ? "ON"
        : "OFF";
      cameraStates[`${name}/object_descriptions/state`] = object_descriptions
        ? "ON"
        : "OFF";
      cameraStates[`${name}/review_descriptions/state`] = review_descriptions
        ? "ON"
        : "OFF";
    });

    setWsState((prevState) => ({
      ...prevState,
      ...cameraStates,
    }));

    // we only want this to run initially when the config is loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsState["camera_activity"]]);

  // ws handler
  const { sendJsonMessage, readyState } = useWebSocket(wsUrl, {
    onMessage: (event) => {
      const data: Update = JSON.parse(event.data);

      if (data) {
        setWsState((prevState) => ({
          ...prevState,
          [data.topic]: data.payload,
        }));
      }
    },
    onOpen: () => {
      sendJsonMessage({
        topic: "onConnect",
        message: "",
        retain: false,
      });
    },
    onClose: () => {},
    shouldReconnect: () => true,
    retryOnError: true,
  });

  const setState = useCallback(
    (message: Update) => {
      if (readyState === ReadyState.OPEN) {
        sendJsonMessage({
          topic: message.topic,
          payload: message.payload,
          retain: message.retain,
        });
      }
    },
    [readyState, sendJsonMessage],
  );

  return [wsState, setState];
}

export const {
  Provider: WsProvider,
  useTrackedState: useWsState,
  useUpdate: useWsUpdate,
} = createContainer(useValue, { defaultState: {}, concurrentMode: true });

export function useWs(watchTopic: string, publishTopic: string) {
  const state = useWsState();
  const sendJsonMessage = useWsUpdate();

  const value = { payload: state[watchTopic] || null };

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
  return { payload: JSON.parse(payload as string) };
}

export function useAudioDetections(): { payload: FrigateAudioDetections } {
  const {
    value: { payload },
  } = useWs("audio_detections", "");
  return { payload: JSON.parse(payload as string) };
}

export function useFrigateReviews(): FrigateReview {
  const {
    value: { payload },
  } = useWs("reviews", "");
  return useDeepMemo(JSON.parse(payload as string));
}

export function useFrigateStats(): FrigateStats {
  const {
    value: { payload },
  } = useWs("stats", "");
  return useDeepMemo(JSON.parse(payload as string));
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
  } = useWs("camera_activity", "onConnect");

  const data = useDeepMemo(JSON.parse(payload as string));

  useEffect(() => {
    let listener = undefined;
    if (revalidateOnFocus) {
      sendCommand("onConnect");
      listener = () => {
        if (document.visibilityState == "visible") {
          sendCommand("onConnect");
        }
      };
      addEventListener("visibilitychange", listener);
    }

    return () => {
      if (listener) {
        removeEventListener("visibilitychange", listener);
      }
    };
    // only refresh when onRefresh value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revalidateOnFocus]);

  return { payload: data ? data[camera] : undefined };
}

export function useModelState(
  model: string,
  revalidateOnFocus: boolean = true,
): { payload: ModelState } {
  const {
    value: { payload },
    send: sendCommand,
  } = useWs("model_state", "modelState");

  const data = useDeepMemo(JSON.parse(payload as string));

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

  const data = useDeepMemo(JSON.parse(payload as string));

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

  const data = useDeepMemo(
    payload ? (JSON.parse(payload as string) as string) : "idle",
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

  const data = useDeepMemo(JSON.parse(payload as string));

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
  const parsed = payload
    ? JSON.parse(payload as string)
    : { type: "", id: "", camera: "" };
  return { payload: useDeepMemo(parsed) };
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
  const parsed = payload
    ? JSON.parse(payload as string)
    : { name: "", camera: "", event_id: "", type: "", score: 0 };
  return { payload: useDeepMemo(parsed) };
}

export function useJobStatus(
  jobType: string,
  revalidateOnFocus: boolean = true,
): { payload: Job | null } {
  const {
    value: { payload },
    send: sendCommand,
  } = useWs("job_state", "jobState");

  const jobData = useDeepMemo(
    payload && typeof payload === "string" ? JSON.parse(payload) : {},
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
