import { baseUrl } from "./baseUrl";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { produce, Draft } from "immer";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { FrigateConfig } from "@/types/frigateConfig";

type ReducerState = {
  [topic: string]: {
    lastUpdate: number;
    payload: string;
    retain: boolean;
  };
};

type ReducerAction = {
  topic: string;
  payload: string;
  retain: boolean;
};

const initialState: ReducerState = {
  _initial_state: {
    lastUpdate: 0,
    payload: "",
    retain: false,
  },
};

type WebSocketContextProps = {
  state: ReducerState;
  readyState: ReadyState;
  sendJsonMessage: (message: any) => void;
};

export const WS = createContext<WebSocketContextProps>({
  state: initialState,
  readyState: ReadyState.CLOSED,
  sendJsonMessage: () => {},
});

export const useWebSocketContext = (): WebSocketContextProps => {
  const context = useContext(WS);
  if (!context) {
    throw new Error(
      "useWebSocketContext must be used within a WebSocketProvider"
    );
  }
  return context;
};

function reducer(state: ReducerState, action: ReducerAction): ReducerState {
  switch (action.topic) {
    default:
      return produce(state, (draftState: Draft<ReducerState>) => {
        let parsedPayload = action.payload;
        try {
          parsedPayload = action.payload && JSON.parse(action.payload);
        } catch (e) {}
        draftState[action.topic] = {
          lastUpdate: Date.now(),
          payload: parsedPayload,
          retain: action.retain,
        };
      });
  }
}

type WsProviderType = {
  config: FrigateConfig;
  children: ReactNode;
  wsUrl?: string;
};

export function WsProvider({
  config,
  children,
  wsUrl = `${baseUrl.replace(/^http/, "ws")}ws`,
}: WsProviderType) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const { sendJsonMessage, readyState } = useWebSocket(wsUrl, {
    onMessage: (event) => {
      dispatch(JSON.parse(event.data));
    },
    onOpen: () => dispatch({ topic: "", payload: "", retain: false }),
    shouldReconnect: () => true,
  });

  useEffect(() => {
    Object.keys(config.cameras).forEach((camera) => {
      const { name, record, detect, snapshots, audio } = config.cameras[camera];
      dispatch({
        topic: `${name}/recordings/state`,
        payload: record.enabled ? "ON" : "OFF",
        retain: false,
      });
      dispatch({
        topic: `${name}/detect/state`,
        payload: detect.enabled ? "ON" : "OFF",
        retain: false,
      });
      dispatch({
        topic: `${name}/snapshots/state`,
        payload: snapshots.enabled ? "ON" : "OFF",
        retain: false,
      });
      dispatch({
        topic: `${name}/audio/state`,
        payload: audio.enabled ? "ON" : "OFF",
        retain: false,
      });
    });
  }, [config]);

  return (
    <WS.Provider value={{ state, readyState, sendJsonMessage }}>
      {children}
    </WS.Provider>
  );
}

export function useWs(watchTopic: string, publishTopic: string) {
  const { state, readyState, sendJsonMessage } = useWebSocketContext();

  const value = state[watchTopic] || { payload: null };

  const send = useCallback(
    (payload: string, retain = false) => {
      if (readyState === ReadyState.OPEN) {
        sendJsonMessage({
          topic: publishTopic || watchTopic,
          payload,
          retain,
        });
      }
    },
    [sendJsonMessage, readyState, watchTopic, publishTopic]
  );

  return { value, send };
}

export function useDetectState(camera: string) {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/detect/state`, `${camera}/detect/set`);
  return { payload, send };
}

export function useRecordingsState(camera: string) {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/recordings/state`, `${camera}/recordings/set`);
  return { payload, send };
}

export function useSnapshotsState(camera: string) {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/snapshots/state`, `${camera}/snapshots/set`);
  return { payload, send };
}

export function useAudioState(camera: string) {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/audio/state`, `${camera}/audio/set`);
  return { payload, send };
}

export function usePtzCommand(camera: string) {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/ptz`, `${camera}/ptz`);
  return { payload, send };
}

export function useRestart() {
  const {
    value: { payload },
    send,
  } = useWs("restart", "restart");
  return { payload, send };
}
