import { useFrigateStats } from "@/api/ws";
import useStats from "@/hooks/use-stats";
import { FrigateStats } from "@/types/stats";
import { useMemo } from "react";
import { IoIosWarning } from "react-icons/io";
import { MdCircle } from "react-icons/md";
import useSWR from "swr";

export default function Statusbar() {
  const { data: initialStats } = useSWR<FrigateStats>("stats", {
    revalidateOnFocus: false,
  });
  const { payload: latestStats } = useFrigateStats();
  const stats = useMemo(() => {
    if (latestStats) {
      return latestStats;
    }

    return initialStats;
  }, [initialStats, latestStats]);

  const cpuPercent = useMemo(() => {
    const systemCpu = stats?.cpu_usages["frigate.full_system"]?.cpu;

    if (!systemCpu || systemCpu == "0.0") {
      return null;
    }

    return parseInt(systemCpu);
  }, [stats]);

  const { potentialProblems } = useStats(stats);

  return (
    <div className="absolute left-0 bottom-0 right-0 w-full h-8 flex justify-between items-center px-4 bg-primary z-10 dark:text-secondary-foreground border-t border-secondary-highlight">
      <div className="h-full flex items-center gap-2">
        {cpuPercent && (
          <div className="flex items-center text-sm gap-2">
            <MdCircle
              className={`size-2 ${
                cpuPercent < 50
                  ? "text-success"
                  : cpuPercent < 80
                    ? "text-orange-400"
                    : "text-danger"
              }`}
            />
            CPU {cpuPercent}%
          </div>
        )}
        {Object.entries(stats?.gpu_usages || {}).map(([name, stats]) => {
          if (name == "error-gpu") {
            return;
          }

          let gpuTitle;
          switch (name) {
            case "amd-vaapi":
              gpuTitle = "AMD GPU";
              break;
            case "intel-vaapi":
            case "intel-qsv":
              gpuTitle = "Intel GPU";
              break;
            default:
              gpuTitle = name;
              break;
          }

          const gpu = parseInt(stats.gpu);

          return (
            <div key={gpuTitle} className="flex items-center text-sm gap-2">
              <MdCircle
                className={`size-2 ${
                  gpu < 50
                    ? "text-success"
                    : gpu < 80
                      ? "text-orange-400"
                      : "text-danger"
                }`}
              />
              {gpuTitle} {gpu}%
            </div>
          );
        })}
      </div>
      <div className="h-full flex items-center gap-2">
        {potentialProblems.map((prob) => (
          <div
            key={prob.text}
            className="flex items-center text-sm gap-2 capitalize"
          >
            <IoIosWarning className={`size-5 ${prob.color}`} />
            {prob.text}
          </div>
        ))}
      </div>
    </div>
  );
}
