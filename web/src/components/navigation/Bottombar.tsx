import NavItem from "./NavItem";
import { IoIosWarning } from "react-icons/io";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import useSWR from "swr";
import { FrigateStats } from "@/types/stats";
import { useFrigateStats } from "@/api/ws";
import { useContext, useEffect, useMemo } from "react";
import useStats from "@/hooks/use-stats";
import GeneralSettings from "../menu/GeneralSettings";
import AccountSettings from "../menu/AccountSettings";
import useNavigation from "@/hooks/use-navigation";
import {
  StatusBarMessagesContext,
  StatusMessage,
} from "@/context/statusbar-provider";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { isMobile } from "react-device-detect";

function Bottombar() {
  const navItems = useNavigation("secondary");

  return (
    <div
      className={cn(
        "absolute inset-x-4 bottom-0 flex flex-row items-center justify-between",
        isMobile ? "h-12 landscape:md:h-16" : "h-16",
      )}
    >
      {navItems.map((item) => (
        <NavItem key={item.id} className="p-2" item={item} Icon={item.icon} />
      ))}
      <GeneralSettings className="p-2" />
      <AccountSettings className="p-2" />
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
        <div className="flex h-auto w-full flex-col items-center gap-2 overflow-y-auto overflow-x-hidden py-4">
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
