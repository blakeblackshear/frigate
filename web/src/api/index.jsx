import { h, createContext } from 'preact';
import produce from 'immer';
import { useCallback, useContext, useEffect, useMemo, useRef, useReducer, useState } from 'preact/hooks';

export const ApiHost = createContext(import.meta.env.SNOWPACK_PUBLIC_API_HOST || window.baseUrl || '');

export const FetchStatus = {
  NONE: 'none',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
};

const initialState = Object.freeze({
  host: import.meta.env.SNOWPACK_PUBLIC_API_HOST || window.baseUrl || '',
  queries: {},
});
export const Api = createContext(initialState);
export default Api;

function reducer(state, { type, payload, meta }) {
  switch (type) {
    case 'REQUEST': {
      const { url, request } = payload;
      const data = state.queries[url]?.data || null;
      return produce(state, (draftState) => {
        draftState.queries[url] = { status: FetchStatus.LOADING, data };
      });
    }

    case 'RESPONSE': {
      const { url, ok, data } = payload;
      return produce(state, (draftState) => {
        draftState.queries[url] = { status: ok ? FetchStatus.LOADED : FetchStatus.ERROR, data };
      });
    }

    default:
      return state;
  }
}

export const ApiProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <Api.Provider value={{ state, dispatch }}>{children}</Api.Provider>;
};

function shouldFetch(state, url, forceRefetch = false) {
  if (forceRefetch || !(url in state.queries)) {
    return true;
  }
  const { status } = state.queries[url];

  return status !== FetchStatus.LOADING && status !== FetchStatus.LOADED;
}

export function useFetch(url, forceRefetch) {
  const { state, dispatch } = useContext(Api);

  useEffect(() => {
    if (!shouldFetch(state, url, forceRefetch)) {
      return;
    }

    async function fetchConfig() {
      await dispatch({ type: 'REQUEST', payload: { url } });
      const response = await fetch(`${state.host}${url}`);
      const data = await response.json();
      await dispatch({ type: 'RESPONSE', payload: { url, ok: response.ok, data } });
    }

    fetchConfig();
  }, [url, forceRefetch]);

  if (!(url in state.queries)) {
    return { data: null, status: FetchStatus.NONE };
  }

  const data = state.queries[url].data || null;
  const status = state.queries[url].status;

  return { data, status };
}

export function useApiHost() {
  const { state, dispatch } = useContext(Api);
  return state.host;
}

export function useEvents(searchParams, forceRefetch) {
  const url = `/api/events${searchParams ? `?${searchParams.toString()}` : ''}`;
  return useFetch(url, forceRefetch);
}

export function useEvent(eventId, forceRefetch) {
  const url = `/api/events/${eventId}`;
  return useFetch(url, forceRefetch);
}

export function useConfig(searchParams, forceRefetch) {
  const url = `/api/config${searchParams ? `?${searchParams.toString()}` : ''}`;
  return useFetch(url, forceRefetch);
}

export function useStats(searchParams, forceRefetch) {
  const url = `/api/stats${searchParams ? `?${searchParams.toString()}` : ''}`;
  return useFetch(url, forceRefetch);
}
