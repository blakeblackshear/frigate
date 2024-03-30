import { FrigateStats, PotentialProblem } from "@/types/stats";
import { useMemo } from "react";

export default function useStats(stats: FrigateStats | undefined) {
  const potentialProblems = useMemo<PotentialProblem[]>(() => {
    const problems: PotentialProblem[] = [];

    if (!stats) {
      return problems;
    }

    // check detectors for high inference speeds
    Object.entries(stats["detectors"]).forEach(([key, det]) => {
      if (det["inference_speed"] > 100) {
        problems.push({
          text: `${key} is very slow (${det["inference_speed"]} ms)`,
          color: "text-danger",
        });
      } else if (det["inference_speed"] > 50) {
        problems.push({
          text: `${key} is slow (${det["inference_speed"]} ms)`,
          color: "text-orange-400",
        });
      }
    });

    // check for offline cameras
    Object.entries(stats["cameras"]).forEach(([name, cam]) => {
      if (cam["camera_fps"] == 0) {
        problems.push({
          text: `${name.replaceAll("_", " ")} is offline`,
          color: "text-danger",
        });
      }
    });

    // check camera cpu usages
    Object.entries(stats["cameras"]).forEach(([name, cam]) => {
      const ffmpegAvg = parseFloat(
        stats["cpu_usages"][cam["ffmpeg_pid"]].cpu_average,
      );
      const detectAvg = parseFloat(stats["cpu_usages"][cam["pid"]].cpu_average);

      if (!isNaN(ffmpegAvg) && ffmpegAvg >= 20.0) {
        problems.push({
          text: `${name.replaceAll("_", " ")} has high FFMPEG CPU usage (${ffmpegAvg}%)`,
          color: "text-danger",
        });
      }

      if (!isNaN(detectAvg) && detectAvg >= 40.0) {
        problems.push({
          text: `${name.replaceAll("_", " ")} has high detect CPU usage (${detectAvg}%)`,
          color: "text-danger",
        });
      }
    });

    return problems;
  }, [stats]);

  return { potentialProblems };
}
