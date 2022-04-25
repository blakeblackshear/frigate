import { h, createContext } from 'preact';
import { baseUrl } from './baseUrl';
import produce from 'immer';
import { useCallback, useContext, useEffect, useRef, useReducer } from 'preact/hooks';

const initialState = Object.freeze({ __connected: false });
export const Mqtt = createContext({ state: initialState, connection: null });

const defaultCreateWebsocket = (url) => new WebSocket(url);

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

export function MqttProvider({
  config,
  children,
  createWebsocket = defaultCreateWebsocket,
  mqttUrl = `${baseUrl.replace(/^http/, 'ws')}/ws`,
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wsRef = useRef();

  useEffect(() => {
    Object.keys(config.cameras).forEach((camera) => {
      const { name, record, detect, snapshots } = config.cameras[camera];
      dispatch({ topic: `${name}/recordings/state`, payload: record.enabled ? 'ON' : 'OFF', retain: false });
      dispatch({ topic: `${name}/detect/state`, payload: detect.enabled ? 'ON' : 'OFF', retain: false });
      dispatch({ topic: `${name}/snapshots/state`, payload: snapshots.enabled ? 'ON' : 'OFF', retain: false });
    });
  }, [config]);

  useEffect(
    () => {
      const ws = createWebsocket(mqttUrl);
      ws.onopen = () => {
        dispatch({ topic: '__CLIENT_CONNECTED' });
      };

      ws.onmessage = (event) => {
        dispatch(JSON.parse(event.data));
      };

      wsRef.current = ws;

      return () => {
        ws.close(3000, 'Provider destroyed');
      };
    },
    // Forces reconnecting
    [state.__reconnectAttempts, mqttUrl] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return <Mqtt.Provider value={{ state, ws: wsRef.current }}>{children}</Mqtt.Provider>;
}

export function useMqtt(watchTopic, publishTopic) {
  const { state, ws } = useContext(Mqtt);

  const value = state[watchTopic] || { payload: null };

  const send = useCallback(
    (payload, retain = false) => {
      ws.send(
        JSON.stringify({
          topic: publishTopic || watchTopic,
          payload: typeof payload !== 'string' ? JSON.stringify(payload) : payload,
          retain,
        })
      );
    },
    [ws, watchTopic, publishTopic]
  );

  return { value, send, connected: state.__connected };
}

export function useDetectState(camera) {
  const {
    value: { payload },
    send,
    connected,
  } = useMqtt(`${camera}/detect/state`, `${camera}/detect/set`);
  return { payload, send, connected };
}

export function useRecordingsState(camera) {
  const {
    value: { payload },
    send,
    connected,
  } = useMqtt(`${camera}/recordings/state`, `${camera}/recordings/set`);
  return { payload, send, connected };
}

export function useSnapshotsState(camera) {
  const {
    value: { payload },
    send,
    connected,
  } = useMqtt(`${camera}/snapshots/state`, `${camera}/snapshots/set`);
  return { payload, send, connected };
}

export function useRestart() {
  const {
    value: { payload },
    send,
    connected,
  } = useMqtt('restart', 'restart');
  return { payload, send, connected };
}
