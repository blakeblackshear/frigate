// https://github.com/vercel/swr/issues/1670#issuecomment-1844114401
import { useCallback } from "react";
import { cache, mutate } from "swr/_internal";

const useGlobalMutation = () => {
  return useCallback((swrKey: string | ((key: string) => boolean), ...args) => {
    if (typeof swrKey === "function") {
      const keys = Array.from(cache.keys()).filter(swrKey);
      keys.forEach((key) => mutate(key, ...args));
    } else {
      mutate(swrKey, ...args);
    }
  }, []) as typeof mutate;
};

export default useGlobalMutation;
