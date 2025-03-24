import { useMemo } from "react";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";

export function useConfigValidator() {
  const { data: config } = useSWR<FrigateConfig>("config");

  const invalidConfig = useMemo(() => {
    return config?.environment_vars?.INVALID_CONFIG;
  }, [config]);

  return invalidConfig;
}
