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

function Bottombar() {
  const navItems = useNavigation("secondary");

  return (
    <div className="absolute h-16 inset-x-4 bottom-0 flex flex-row items-center justify-between">
      {navItems.map((item) => (
        <NavItem key={item.id} item={item} Icon={item.icon} />
      ))}
      <GeneralSettings />
      <AccountSettings />
      <StatusAlertNav />
    </div>
  );
}

function StatusAlertNav() {
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
      addMessage("stats", problem.text, problem.color);
    });
  }, [potentialProblems, addMessage, clearMessages]);

  if (!messages || Object.keys(messages).length === 0) {
    return;
  }

  return (
    <Drawer>
      <DrawerTrigger>
        <IoIosWarning className="size-5 text-danger" />
      </DrawerTrigger>
      <DrawerContent className="max-h-[75dvh] px-2 mx-1 rounded-t-2xl overflow-hidden">
        <div className="w-full h-auto py-4 overflow-y-auto overflow-x-hidden flex flex-col items-center gap-2">
          {Object.entries(messages).map(([key, messageArray]) => (
            <div key={key} className="w-full flex items-center gap-2">
              {messageArray.map(({ id, text, color }: StatusMessage) => (
                <div key={id} className="flex items-center text-xs gap-2">
                  <IoIosWarning
                    className={`size-5 ${color || "text-danger"}`}
                  />
                  {text}
                </div>
              ))}
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default Bottombar;
