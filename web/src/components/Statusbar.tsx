import { useEmbeddingsReindexProgress } from "@/api/ws";
import {
  StatusBarMessagesContext,
  StatusMessage,
} from "@/context/statusbar-provider";
import useStats, { useAutoFrigateStats } from "@/hooks/use-stats";
import { useContext, useEffect, useMemo } from "react";
import { FaCheck } from "react-icons/fa";
import { IoIosWarning } from "react-icons/io";
import { MdCircle } from "react-icons/md";
import { Link } from "react-router-dom";

export default function Statusbar() {
  const { messages, addMessage, clearMessages } = useContext(
    StatusBarMessagesContext,
  )!;

  const stats = useAutoFrigateStats();

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
      addMessage(
        "stats",
        problem.text,
        problem.color,
        undefined,
        problem.relevantLink,
      );
    });
  }, [potentialProblems, addMessage, clearMessages]);

  const { payload: reindexState } = useEmbeddingsReindexProgress();

  useEffect(() => {
    if (reindexState) {
      if (reindexState.status == "indexing") {
        clearMessages("embeddings-reindex");
        addMessage(
          "embeddings-reindex",
          `Reindexing embeddings (${Math.floor((reindexState.processed_objects / reindexState.total_objects) * 100)}% complete)`,
        );
      }
      if (reindexState.status === "completed") {
        clearMessages("embeddings-reindex");
      }
    }
  }, [reindexState, addMessage, clearMessages]);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 flex h-8 w-full items-center justify-between border-t border-secondary-highlight bg-background_alt px-4 dark:text-secondary-foreground">
      <div className="flex h-full items-center gap-2">
        {cpuPercent && (
          <Link to="/system#general">
            <div className="flex cursor-pointer items-center gap-2 text-sm hover:underline">
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
          </Link>
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

          if (isNaN(gpu)) {
            return;
          }

          return (
            <Link key={gpuTitle} to="/system#general">
              {" "}
              <div
                key={gpuTitle}
                className="flex cursor-pointer items-center gap-2 text-sm hover:underline"
              >
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
            </Link>
          );
        })}
      </div>
      <div className="no-scrollbar flex h-full max-w-[50%] items-center gap-2 overflow-x-auto">
        {Object.entries(messages).length === 0 ? (
          <div className="flex items-center gap-2 text-sm">
            <FaCheck className="size-3 text-green-500" />
            System is healthy
          </div>
        ) : (
          Object.entries(messages).map(([key, messageArray]) => (
            <div key={key} className="flex h-full items-center gap-2">
              {messageArray.map(({ text, color, link }: StatusMessage) => {
                const message = (
                  <div
                    key={text}
                    className={`flex items-center gap-2 whitespace-nowrap text-sm ${link ? "cursor-pointer hover:underline" : ""}`}
                  >
                    <IoIosWarning
                      className={`size-5 ${color || "text-danger"}`}
                    />
                    {text}
                  </div>
                );

                if (link) {
                  return (
                    <Link key={text} to={link}>
                      {message}
                    </Link>
                  );
                } else {
                  return message;
                }
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
