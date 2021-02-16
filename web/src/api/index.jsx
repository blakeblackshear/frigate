import { baseUrl } from './baseUrl';
import { h, createContext } from 'preact';
import { MqttProvider } from './mqtt';
import produce from 'immer';
import { useContext, useEffect, useReducer } from 'preact/hooks';

export const FetchStatus = {
  NONE: 'none',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
};

const initialState = Object.freeze({
  host: baseUrl,
  queries: {},
});

const Api = createContext(initialState);

function reducer(state, { type, payload, meta }) {
  switch (type) {
    case 'REQUEST': {
      const { url, fetchId } = payload;
      const data = state.queries[url]?.data || null;
      return produce(state, (draftState) => {
        draftState.queries[url] = { status: FetchStatus.LOADING, data, fetchId };
      });
    }

    case 'RESPONSE': {
      const { url, ok, data, fetchId } = payload;
      return produce(state, (draftState) => {
        draftState.queries[url] = { status: ok ? FetchStatus.LOADED : FetchStatus.ERROR, data, fetchId };
      });
    }

    default:
      return state;
  }
}

export const ApiProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <Api.Provider value={{ state, dispatch }}>
      <MqttProvider>{children}</MqttProvider>
    </Api.Provider>
  );
};

function shouldFetch(state, url, fetchId = null) {
  if ((fetchId && url in state.queries && state.queries[url].fetchId !== fetchId) || !(url in state.queries)) {
    return true;
  }
  const { status } = state.queries[url];

  return status !== FetchStatus.LOADING && status !== FetchStatus.LOADED;
}

export function useFetch(url, fetchId) {
  const { state, dispatch } = useContext(Api);

  useEffect(() => {
    if (!shouldFetch(state, url, fetchId)) {
      return;
    }

    async function fetchData() {
      await dispatch({ type: 'REQUEST', payload: { url, fetchId } });
      const response = await fetch(`${state.host}${url}`);
      try {
        const data = await response.json();
        await dispatch({ type: 'RESPONSE', payload: { url, ok: response.ok, data, fetchId } });
      } catch (e) {
        await dispatch({ type: 'RESPONSE', payload: { url, ok: false, data: null, fetchId } });
      }
    }

    fetchData();
  }, [url, fetchId, state, dispatch]);

  if (!(url in state.queries)) {
    return { data: null, status: FetchStatus.NONE };
  }

  const data = state.queries[url].data || null;
  const status = state.queries[url].status;

  return { data, status };
}

export function useApiHost() {
  const { state } = useContext(Api);
  return state.host;
}

export function useEvents(searchParams, fetchId) {
  const url = `/api/events${searchParams ? `?${searchParams.toString()}` : ''}`;
  return useFetch(url, fetchId);
}

export function useEvent(eventId, fetchId) {
  const url = `/api/events/${eventId}`;
  return useFetch(url, fetchId);
}

export function useConfig(searchParams, fetchId) {
  const url = `/api/config${searchParams ? `?${searchParams.toString()}` : ''}`;
  return useFetch(url, fetchId);
}

export function useStats(searchParams, fetchId) {
  const url = `/api/stats${searchParams ? `?${searchParams.toString()}` : ''}`;
  return useFetch(url, fetchId);
}
