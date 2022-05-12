import { h } from 'preact';
import { baseUrl } from './baseUrl';
import useSWR, { SWRConfig } from 'swr';
import { MqttProvider } from './mqtt';
import axios from 'axios';

axios.defaults.baseURL = `${baseUrl}/api/`;

export function ApiProvider({ children, options }) {
  return (
    <SWRConfig
      value={{
        fetcher: (path, params) => axios.get(path, { params }).then((res) => res.data),
        ...options,
      }}
    >
      <MqttWithConfig>{children}</MqttWithConfig>
    </SWRConfig>
  );
}

function MqttWithConfig({ children }) {
  const { data } = useSWR('config');
  return data ? <MqttProvider config={data}>{children}</MqttProvider> : children;
}

export function useApiHost() {
  return baseUrl;
}
