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
  children,
  createWebsocket = defaultCreateWebsocket,
  mqttUrl = `${baseUrl.replace(/^https?:/, 'ws:')}/ws`,
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wsRef = useRef();

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

export function useMqtt(topic) {
  const { state, ws } = useContext(Mqtt);

  const value = state[topic] || { payload: null };

  const send = useCallback(
    (payload) => {
      ws.send(JSON.stringify({ topic, payload: typeof payload !== 'string' ? JSON.stringify(payload) : payload }));
    },
    [ws, topic]
  );

  return { value, send, connected: state.__connected };
}
