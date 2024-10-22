import NavItem from "./NavItem";
import { IoIosWarning } from "react-icons/io";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import useSWR from "swr";
import { FrigateStats } from "@/types/stats";
import { useEmbeddingsReindexProgress, useFrigateStats } from "@/api/ws";
import { useContext, useEffect, useMemo } from "react";
import useStats from "@/hooks/use-stats";
import GeneralSettings from "../menu/GeneralSettings";
import useNavigation from "@/hooks/use-navigation";
import {
  StatusBarMessagesContext,
  StatusMessage,
} from "@/context/statusbar-provider";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { isIOS, isMobile } from "react-device-detect";
import { isPWA } from "@/utils/isPWA";

function Bottombar() {
  const navItems = useNavigation("secondary");

  return (
    <div
      className={cn(
        "absolute inset-x-4 bottom-0 flex h-16 flex-row justify-between",
        isPWA && isIOS
          ? "portrait:items-start portrait:pt-1 landscape:items-center"
          : "items-center",
        isMobile && !isPWA && "h-12 md:h-16",
      )}
    >
      {navItems.map((item) => (
        <NavItem key={item.id} className="p-2" item={item} Icon={item.icon} />
      ))}
      <GeneralSettings className="p-2" />
      <StatusAlertNav className="p-2" />
    </div>
  );
}

type StatusAlertNavProps = {
  className?: string;
};
function StatusAlertNav({ className }: StatusAlertNavProps) {
  const { data: initialStats } = useSWR<FrigateStats>("stats", {
    revalidateOnFocus: false,
  });
  const latestStats = useFrigateStats();

  const { messages, addMessage, clearMessages } = useContext(
    StatusBarMessagesContext,
  )!;

  const stats = useMemo(() => {
    if (latestStats) {
      return latestStats;
    }

    return initialStats;
  }, [initialStats, latestStats]);
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

  if (!messages || Object.keys(messages).length === 0) {
    return;
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <div className="p-2">
          <IoIosWarning className="size-5 text-danger md:m-[6px]" />
        </div>
      </DrawerTrigger>
      <DrawerContent
        className={cn(
          "mx-1 max-h-[75dvh] overflow-hidden rounded-t-2xl px-2",
          className,
        )}
      >
        <div className="scrollbar-container flex h-auto w-full flex-col items-center gap-2 overflow-y-auto overflow-x-hidden py-4">
          {Object.entries(messages).map(([key, messageArray]) => (
            <div key={key} className="flex w-full items-center gap-2">
              {messageArray.map(({ id, text, color, link }: StatusMessage) => {
                const message = (
                  <div key={id} className="flex items-center gap-2 text-xs">
                    <IoIosWarning
                      className={`size-5 ${color || "text-danger"}`}
                    />
                    {text}
                  </div>
                );

                if (link) {
                  return (
                    <Link key={id} to={link}>
                      {message}
                    </Link>
                  );
                } else {
                  return message;
                }
              })}
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default Bottombar;
