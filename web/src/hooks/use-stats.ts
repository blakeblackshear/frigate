import { FrigateConfig } from "@/types/frigateConfig";
import {
  CameraDetectThreshold,
  CameraFfmpegThreshold,
  InferenceThreshold,
} from "@/types/graph";
import { FrigateStats, PotentialProblem } from "@/types/stats";
import { useMemo } from "react";
import useSWR from "swr";
import useDeepMemo from "./use-deep-memo";
import { capitalizeFirstLetter } from "@/utils/stringUtil";
import { useFrigateStats } from "@/api/ws";

import { useTranslation } from "react-i18next";

export default function useStats(stats: FrigateStats | undefined) {
  const { t } = useTranslation(["views/system"]);
  const { data: config } = useSWR<FrigateConfig>("config");

  const memoizedStats = useDeepMemo(stats);

  const potentialProblems = useMemo<PotentialProblem[]>(() => {
    const problems: PotentialProblem[] = [];

    if (!memoizedStats) {
      return problems;
    }

    // if frigate has just started
    // don't look for issues
    if (memoizedStats.service.uptime < 120) {
      return problems;
    }

    // check detectors for high inference speeds
    Object.entries(memoizedStats["detectors"]).forEach(([key, det]) => {
      if (det["inference_speed"] > InferenceThreshold.error) {
        problems.push({
          text: `${capitalizeFirstLetter(key)} is very slow (${det["inference_speed"]} ms)`,
          color: "text-danger",
          relevantLink: "/system#general",
        });
      } else if (det["inference_speed"] > InferenceThreshold.warning) {
        problems.push({
          text: `${capitalizeFirstLetter(key)} is slow (${det["inference_speed"]} ms)`,
          color: "text-orange-400",
          relevantLink: "/system#general",
        });
      }
    });

    // check for offline cameras
    Object.entries(memoizedStats["cameras"]).forEach(([name, cam]) => {
      if (!config) {
        return;
      }

      if (config.cameras[name].enabled && cam["camera_fps"] == 0) {
        problems.push({
          text: `${capitalizeFirstLetter(name.replaceAll("_", " "))} is offline`,
          color: "text-danger",
          relevantLink: "logs",
        });
      }
    });

    // check camera cpu usages
    Object.entries(memoizedStats["cameras"]).forEach(([name, cam]) => {
      const ffmpegAvg = parseFloat(
        memoizedStats["cpu_usages"][cam["ffmpeg_pid"]]?.cpu_average,
      );
      const detectAvg = parseFloat(
        memoizedStats["cpu_usages"][cam["pid"]]?.cpu_average,
      );

      if (!isNaN(ffmpegAvg) && ffmpegAvg >= CameraFfmpegThreshold.error) {
        problems.push({
          text: t("stats.ffmpegHighCpuUsage", {
            camera: capitalizeFirstLetter(name.replaceAll("_", " ")),
            ffmpegAvg,
          }),
          color: "text-danger",
          relevantLink: "/system#cameras",
        });
      }

      if (!isNaN(detectAvg) && detectAvg >= CameraDetectThreshold.error) {
        problems.push({
          text: t("stats.detectHighCpuUsage", {
            camera: capitalizeFirstLetter(name.replaceAll("_", " ")),
            detectAvg,
          }),
          color: "text-danger",
          relevantLink: "/system#cameras",
        });
      }
    });

    return problems;
  }, [config, memoizedStats, t]);

  return { potentialProblems };
}

export function useAutoFrigateStats() {
  const { data: initialStats } = useSWR<FrigateStats>("stats", {
    revalidateOnFocus: false,
  });
  const latestStats = useFrigateStats();

  const stats = useMemo(() => {
    if (latestStats) {
      return latestStats;
    }

    return initialStats;
  }, [initialStats, latestStats]);

  return stats;
}
