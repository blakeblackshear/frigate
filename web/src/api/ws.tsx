import { baseUrl } from "./baseUrl";
import { useCallback, useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  FrigateCameraState,
  FrigateEvent,
  FrigateReview,
  ToggleableSetting,
} from "@/types/ws";
import { FrigateStats } from "@/types/stats";
import useSWR from "swr";
import { createContainer } from "react-tracked";

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
  // basic config
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const wsUrl = `${baseUrl.replace(/^http/, "ws")}ws`;

  // main state
  const [wsState, setWsState] = useState<WsState>({});

  useEffect(() => {
    if (!config) {
      return;
    }

    const cameraStates: WsState = {};

    Object.keys(config.cameras).forEach((camera) => {
      const { name, record, detect, snapshots, audio, onvif } =
        config.cameras[camera];
      cameraStates[`${name}/recordings/state`] = record.enabled ? "ON" : "OFF";
      cameraStates[`${name}/detect/state`] = detect.enabled ? "ON" : "OFF";
      cameraStates[`${name}/snapshots/state`] = snapshots.enabled
        ? "ON"
        : "OFF";
      cameraStates[`${name}/audio/state`] = audio.enabled ? "ON" : "OFF";
      cameraStates[`${name}/ptz_autotracker/state`] = onvif.autotracking.enabled
        ? "ON"
        : "OFF";
    });

    setWsState({ ...wsState, ...cameraStates });
    // we only want this to run initially when the config is loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

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

export function useFrigateReviews(): { payload: FrigateReview } {
  const {
    value: { payload },
  } = useWs("reviews", "");
  return { payload: JSON.parse(payload as string) };
}

export function useFrigateStats(): { payload: FrigateStats } {
  const {
    value: { payload },
  } = useWs("stats", "");
  return { payload: JSON.parse(payload as string) };
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
  const data = JSON.parse(payload as string);

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
