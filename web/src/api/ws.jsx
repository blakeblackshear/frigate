import { createContext } from 'preact';
import { baseUrl } from './baseUrl';
import { produce } from 'immer';
import { useCallback, useContext, useEffect, useReducer } from 'preact/hooks';
import useWebSocket from 'react-use-websocket';

const initialState = Object.freeze({ __connected: false });
export const WS = createContext({ state: initialState, connection: null });

function reducer(state, { topic, payload, retain }) {
  switch (topic) {
    case '__CLIENT_CONNECTED':
      return produce(state, (draftState) => {
        draftState.__connected = true;
      });

    default:
      return produce(state, (draftState) => {
        let parsedPayload = payload;
        try {
          parsedPayload = payload && JSON.parse(payload);
        } catch (e) {}
        draftState[topic] = {
          lastUpdate: Date.now(),
          payload: parsedPayload,
          retain,
        };
      });
  }
}

export function WsProvider({
  config,
  children,
  wsUrl = `${baseUrl.replace(/^http/, 'ws')}ws`,
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  console.log(dispatch);

  const { sendJsonMessage } = useWebSocket(wsUrl, {

    onMessage: (event) => {
      dispatch(event.data);
    },
    onOpen: () => dispatch({ topic: '__CLIENT_CONNECTED' }),
    shouldReconnect: () => true,
  });

  useEffect(() => {
    Object.keys(config.cameras).forEach((camera) => {
      console.log("Setting up")
      const { name, record, detect, snapshots, audio } = config.cameras[camera];
      dispatch({ topic: `${name}/recordings/state`, payload: record.enabled ? 'ON' : 'OFF', retain: false });
      dispatch({ topic: `${name}/detect/state`, payload: detect.enabled ? 'ON' : 'OFF', retain: false });
      dispatch({ topic: `${name}/snapshots/state`, payload: snapshots.enabled ? 'ON' : 'OFF', retain: false });
      dispatch({ topic: `${name}/audio/state`, payload: audio.enabled ? 'ON' : 'OFF', retain: false });
    });
  }, [config]);


  return <WS.Provider value={{ state, sendJsonMessage }}>{children}</WS.Provider>;
}

export function useWs(watchTopic, publishTopic) {
  const { state, sendJsonMessage } = useContext(WS);

  console.log(state);

  const value = state[watchTopic] || { payload: null };

  const send = useCallback(
    (payload, retain = false) => {
      console.log("sending json");
      sendJsonMessage({
        topic: publishTopic || watchTopic,
        payload: payload,
        retain,
      });
    },
    [sendJsonMessage, watchTopic, publishTopic]
  );

  return { value, send, connected: state.__connected };
}

export function useDetectState(camera) {
  const {
    value: { payload },
    send,
    connected,
  } = useWs(`${camera}/detect/state`, `${camera}/detect/set`);
  return { payload, send, connected };
}

export function useRecordingsState(camera) {
  const {
    value: { payload },
    send,
    connected,
  } = useWs(`${camera}/recordings/state`, `${camera}/recordings/set`);
  return { payload, send, connected };
}

export function useSnapshotsState(camera) {
  const {
    value: { payload },
    send,
    connected,
  } = useWs(`${camera}/snapshots/state`, `${camera}/snapshots/set`);
  return { payload, send, connected };
}

export function useAudioState(camera) {
  const {
    value: { payload },
    send,
    connected,
  } = useWs(`${camera}/audio/state`, `${camera}/audio/set`);
  return { payload, send, connected };
}

export function usePtzCommand(camera) {
  const {
    value: { payload },
    send,
    connected,
  } = useWs(`${camera}/ptz`, `${camera}/ptz`);
  return { payload, send, connected };
}

export function useRestart() {
  const {
    value: { payload },
    send,
    connected,
  } = useWs('restart', 'restart');
  return { payload, send, connected };
}
