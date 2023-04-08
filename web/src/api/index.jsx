import { h } from 'preact';
import { baseUrl } from './baseUrl';
import useSWR, { SWRConfig } from 'swr';
import { WsProvider } from './ws';
import axios from 'axios';

axios.defaults.baseURL = `${baseUrl}api/`;

export function ApiProvider({ children, options }) {
  return (
    <SWRConfig
      value={{
        fetcher: (path, params) => axios.get(path, { params }).then((res) => res.data),
        ...options,
      }}
    >
      <WsWithConfig>{children}</WsWithConfig>
    </SWRConfig>
  );
}

function WsWithConfig({ children }) {
  const { data } = useSWR('config');
  return data ? <WsProvider config={data}>{children}</WsProvider> : children;
}

export function useApiHost() {
  return baseUrl;
}
