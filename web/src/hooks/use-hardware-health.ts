import { useCallback, useMemo, useState } from "react";
import axios from "axios";
import useSWR, { useSWRConfig } from "swr";
import { useTranslation } from "react-i18next";
import type {
  DetectionHardware,
  HwaccelRecommendation,
} from "@/types/hardware";
import type { FrigateConfig } from "@/types/frigateConfig";
import { useAutoFrigateStats } from "@/hooks/use-stats";
import {
  cameraConnectionCells,
  detectionRows,
  enrichmentRows,
  hwaccelRows,
  isStartupWindow,
} from "@/utils/health";

export function useHardwareHealth() {
  const { t } = useTranslation(["views/system", "views/setup"]);
  const { mutate } = useSWRConfig();
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const { data: hardware, error: probeError } = useSWR<DetectionHardware[]>(
    "hardware/probe",
    { revalidateOnFocus: false },
  );
  const { data: hwaccel, error: hwaccelError } = useSWR<HwaccelRecommendation>(
    "hardware/hwaccel",
    { revalidateOnFocus: false },
  );
  const stats = useAutoFrigateStats();
  const [rechecking, setRechecking] = useState(false);

  const recheck = useCallback(async () => {
    setRechecking(true);
    try {
      await axios.get("hardware/probe", { params: { refresh: true } });
      await Promise.all([mutate("hardware/probe"), mutate("hardware/hwaccel")]);
    } finally {
      setRechecking(false);
    }
  }, [mutate]);

  const rows = useMemo(() => {
    if (!config) {
      return undefined;
    }

    const startup = isStartupWindow(stats);
    return {
      detection: detectionRows({
        models: config.models,
        hardware,
        probeFailed: !!probeError,
        stats,
        startup,
        t,
      }),
      hwaccel: hwaccelRows({
        config,
        hwaccel,
        hwaccelFailed: !!hwaccelError,
        stats,
        t,
      }),
      enrichments: enrichmentRows({
        config,
        hardware,
        probeFailed: !!probeError,
        stats,
        startup,
        t,
      }),
      cameras: cameraConnectionCells(config, stats),
    };
  }, [config, hardware, probeError, hwaccel, hwaccelError, stats, t]);

  return { rows, statsLoaded: !!stats, recheck, rechecking };
}
