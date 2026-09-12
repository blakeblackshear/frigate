import { useEmbeddingsReindexProgress } from "@/api/ws";
import {
  StatusBarMessagesContext,
  StatusMessage,
} from "@/context/statusbar-provider";
import useStats, { useAutoFrigateStats } from "@/hooks/use-stats";
import { cn } from "@/lib/utils";
import type { ProfilesApiResponse } from "@/types/profile";
import { getProfileColor } from "@/utils/profileColors";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useContext, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";

import { FaCheck } from "react-icons/fa";
import { IoIosWarning } from "react-icons/io";
import { MdCircle } from "react-icons/md";
import { Link } from "react-router-dom";

export default function Statusbar() {
  const { t } = useTranslation(["views/system"]);
  const isAdmin = useIsAdmin();

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

  const { data: profilesData } = useSWR<ProfilesApiResponse>("profiles");

  const activeProfile = useMemo(() => {
    if (!profilesData?.active_profile || !profilesData.profiles) return null;
    const info = profilesData.profiles.find(
      (p) => p.name === profilesData.active_profile,
    );
    const allNames = profilesData.profiles.map((p) => p.name).sort();
    return {
      name: profilesData.active_profile,
      friendlyName: info?.friendly_name ?? profilesData.active_profile,
      color: getProfileColor(profilesData.active_profile, allNames),
    };
  }, [profilesData]);

  const { payload: reindexState } = useEmbeddingsReindexProgress();

  useEffect(() => {
    if (reindexState) {
      if (reindexState.status == "indexing") {
        clearMessages("embeddings-reindex");
        addMessage(
          "embeddings-reindex",
          t("stats.reindexingEmbeddings", {
            processed: Math.floor(
              (reindexState.processed_objects / reindexState.total_objects) *
                100,
            ),
          }),
        );
      }
      if (reindexState.status === "completed") {
        clearMessages("embeddings-reindex");
      }
    }
  }, [reindexState, addMessage, clearMessages, t]);

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
            case "intel-gpu":
              gpuTitle = "Intel GPU";
              break;
            case "rockchip":
              gpuTitle = "Rockchip GPU";
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
            <Link key={name} to="/system#general">
              {" "}
              <div
                key={name}
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
        {activeProfile &&
          (isAdmin ? (
            <Link to="/settings?page=profiles">
              <div className="flex cursor-pointer items-center gap-2 text-sm hover:underline">
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    activeProfile.color.dot,
                  )}
                />
                <span className="max-w-[150px] truncate">
                  {activeProfile.friendlyName}
                </span>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  activeProfile.color.dot,
                )}
              />
              <span className="max-w-[150px] truncate">
                {activeProfile.friendlyName}
              </span>
            </div>
          ))}
      </div>
      <div className="no-scrollbar flex h-full max-w-[50%] items-center gap-2 overflow-x-auto">
        {Object.entries(messages).length === 0 ? (
          <div className="flex items-center gap-2 text-sm">
            <FaCheck className="size-3 text-green-500" />
            {t("stats.healthy")}
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
