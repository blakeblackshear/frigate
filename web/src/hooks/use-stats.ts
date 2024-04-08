import { FrigateConfig } from "@/types/frigateConfig";
import {
  CameraDetectThreshold,
  CameraFfmpegThreshold,
  InferenceThreshold,
} from "@/types/graph";
import { FrigateStats, PotentialProblem } from "@/types/stats";
import { useMemo } from "react";
import useSWR from "swr";

export default function useStats(stats: FrigateStats | undefined) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const potentialProblems = useMemo<PotentialProblem[]>(() => {
    const problems: PotentialProblem[] = [];

    if (!stats) {
      return problems;
    }

    // if frigate has just started
    // don't look for issues
    if (stats.service.uptime < 120) {
      return problems;
    }

    // check detectors for high inference speeds
    Object.entries(stats["detectors"]).forEach(([key, det]) => {
      if (det["inference_speed"] > InferenceThreshold.error) {
        problems.push({
          text: `${key} is very slow (${det["inference_speed"]} ms)`,
          color: "text-danger",
        });
      } else if (det["inference_speed"] > InferenceThreshold.warning) {
        problems.push({
          text: `${key} is slow (${det["inference_speed"]} ms)`,
          color: "text-orange-400",
        });
      }
    });

    // check for offline cameras
    Object.entries(stats["cameras"]).forEach(([name, cam]) => {
      if (!config) {
        return;
      }

      if (config.cameras[name].enabled && cam["camera_fps"] == 0) {
        problems.push({
          text: `${name.replaceAll("_", " ")} is offline`,
          color: "text-danger",
        });
      }
    });

    // check camera cpu usages
    Object.entries(stats["cameras"]).forEach(([name, cam]) => {
      const ffmpegAvg = parseFloat(
        stats["cpu_usages"][cam["ffmpeg_pid"]]?.cpu_average,
      );
      const detectAvg = parseFloat(
        stats["cpu_usages"][cam["pid"]]?.cpu_average,
      );

      if (!isNaN(ffmpegAvg) && ffmpegAvg >= CameraFfmpegThreshold.error) {
        problems.push({
          text: `${name.replaceAll("_", " ")} has high FFMPEG CPU usage (${ffmpegAvg}%)`,
          color: "text-danger",
        });
      }

      if (!isNaN(detectAvg) && detectAvg >= CameraDetectThreshold.error) {
        problems.push({
          text: `${name.replaceAll("_", " ")} has high detect CPU usage (${detectAvg}%)`,
          color: "text-danger",
        });
      }
    });

    return problems;
  }, [config, stats]);

  return { potentialProblems };
}
