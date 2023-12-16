import { baseUrl } from "./baseUrl";
import useSWR, { SWRConfig } from "swr";
import { WsProvider } from "./ws";
import axios from "axios";
import { ReactNode } from "react";
import { FrigateConfig } from "@/types/frigateConfig";

axios.defaults.baseURL = `${baseUrl}api/`;

type ApiProviderType = {
  children?: ReactNode;
  options?: Record<string, unknown>;
};

export function ApiProvider({ children, options }: ApiProviderType) {
  axios.defaults.headers.common = {
    "X-CSRF-TOKEN": 1,
    "X-CACHE-BYPASS": 1,
  };

  return (
    <SWRConfig
      value={{
        fetcher: (key) => {
          const [path, params] = Array.isArray(key) ? key : [key, undefined];
          return axios.get(path, { params }).then((res) => res.data);
        },
        ...options,
      }}
    >
      <WsWithConfig>{children}</WsWithConfig>
    </SWRConfig>
  );
}

type WsWithConfigType = {
  children: ReactNode;
};

function WsWithConfig({ children }: WsWithConfigType) {
  const { data } = useSWR<FrigateConfig>("config");

  return data ? <WsProvider config={data}>{children}</WsProvider> : children;
}

export function useApiHost() {
  return baseUrl;
}
