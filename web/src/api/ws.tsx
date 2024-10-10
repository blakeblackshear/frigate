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

  const [hasCameraState, setHasCameraState] = useState(false);
  const [wsState, setWsState] = useState<WsState>({});

  useEffect(() => {
    if (hasCameraState) {
      return;
    }

    const activityValue: string = wsState["camera_activity"] as string;

    if (!activityValue) {
      return;
    }

    const cameraActivity: { [key: string]: object } = JSON.parse(activityValue);

    if (!cameraActivity) {
      return;
    }

    const cameraStates: WsState = {};

    Object.entries(cameraActivity).forEach(([name, state]) => {
      const { record, detect, snapshots, audio, autotracking } =
        // @ts-expect-error we know this is correct
        state["config"];
      cameraStates[`${name}/recordings/state`] = record ? "ON" : "OFF";
      cameraStates[`${name}/detect/state`] = detect ? "ON" : "OFF";
      cameraStates[`${name}/snapshots/state`] = snapshots ? "ON" : "OFF";
      cameraStates[`${name}/audio/state`] = audio ? "ON" : "OFF";
      cameraStates[`${name}/ptz_autotracker/state`] = autotracking
        ? "ON"
        : "OFF";
    });

    setWsState({ ...wsState, ...cameraStates });
    setHasCameraState(true);
    // we only want this to run initially when the config is loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsState]);

  // ws handler
  const { sendJsonMessage, readyState } = useWebSocket(wsUrl, {
    onMessage: (event) => {
      const data: Update = JSON.parse(event.data);

      if (data) {
        setWsState({ ...wsState, [data.topic]: data.payload });
      }
    },
    onOpen: () => {
      sendJsonMessage({
        topic: "onConnect",
        message: "",
        retain: false,
      });
    },
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

export function useEventUpdate(): { payload: string } {
  const {
    value: { payload },
  } = useWs("event_update", "");
  return useDeepMemo(JSON.parse(payload as string));
}
