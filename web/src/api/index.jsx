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
    case 'DELETE': {
      const { eventId } = payload;

      return produce(state, (draftState) => {
        Object.keys(draftState.queries).map((url, index) => {
          // If data has no array length then just return state.
          if (!('data' in draftState.queries[url]) || !draftState.queries[url].data.length) return state;

          //Find the index to remove
          const removeIndex = draftState.queries[url].data.map((event) => event.id).indexOf(eventId);
          if (removeIndex === -1) return state;

          // We need to keep track of deleted items, This will be used to re-calculate "ReachEnd" for auto load new events. Events.jsx
          const totDeleted = state.queries[url].deleted || 0;

          // Splice the deleted index.
          draftState.queries[url].data.splice(removeIndex, 1);
          draftState.queries[url].deleted = totDeleted + 1;
        });
      });
    }
    default:
      return state;
  }
}

export function ApiProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <Api.Provider value={{ state, dispatch }}>
      <MqttWithConfig>{children}</MqttWithConfig>
    </Api.Provider>
  );
}

function MqttWithConfig({ children }) {
  const { data, status } = useConfig();
  return status === FetchStatus.LOADED ? <MqttProvider config={data}>{children}</MqttProvider> : children;
}

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
  const deleted = state.queries[url].deleted || 0;

  return { data, status, deleted };
}

export function useDelete() {
  const { dispatch, state } = useContext(Api);

  async function deleteEvent(eventId) {
    if (!eventId) return null;

    const response = await fetch(`${state.host}/api/events/${eventId}`, { method: 'DELETE' });
    await dispatch({ type: 'DELETE', payload: { eventId } });
    return await (response.status < 300 ? response.json() : { success: true });
  }

  return deleteEvent;
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

export function useRecording(camera, fetchId) {
  const url = `/api/${camera}/recordings`;
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
