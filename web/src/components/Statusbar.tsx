import { useFrigateStats } from "@/api/ws";
import {
  StatusBarMessagesContext,
  StatusMessage,
} from "@/context/statusbar-provider";
import useStats from "@/hooks/use-stats";
import { FrigateStats } from "@/types/stats";
import { useContext, useEffect, useMemo } from "react";
import { FaCheck } from "react-icons/fa";
import { IoIosWarning } from "react-icons/io";
import { MdCircle } from "react-icons/md";
import useSWR from "swr";

export default function Statusbar() {
  const { data: initialStats } = useSWR<FrigateStats>("stats", {
    revalidateOnFocus: false,
  });
  const { payload: latestStats } = useFrigateStats();
  const { messages, addMessage, clearMessages } = useContext(
    StatusBarMessagesContext,
  )!;

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

  useEffect(() => {
    clearMessages("stats");
    potentialProblems.forEach((problem) => {
      addMessage("stats", problem.text, problem.color);
    });
  }, [potentialProblems, addMessage, clearMessages]);

  return (
    <div className="absolute left-0 bottom-0 right-0 w-full h-8 flex justify-between items-center px-4 bg-background_alt z-10 dark:text-secondary-foreground border-t border-secondary-highlight">
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
        {Object.entries(messages).length === 0 ? (
          <div className="flex items-center text-sm gap-2">
            <FaCheck className="size-3 text-green-500" />
            System is healthy
          </div>
        ) : (
          Object.entries(messages).map(([key, messageArray]) => (
            <div key={key} className="h-full flex items-center gap-2">
              {messageArray.map(({ id, text, color }: StatusMessage) => (
                <div key={id} className="flex items-center text-sm gap-2">
                  <IoIosWarning
                    className={`size-5 ${color || "text-danger"}`}
                  />
                  {text}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
