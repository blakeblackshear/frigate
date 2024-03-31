import { navbarLinks } from "@/pages/site-navigation";
import NavItem from "./NavItem";
import { IoIosWarning } from "react-icons/io";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import useSWR from "swr";
import { FrigateStats } from "@/types/stats";
import { useFrigateStats } from "@/api/ws";
import { useMemo } from "react";
import useStats from "@/hooks/use-stats";
import GeneralSettings from "../settings/GeneralSettings";
import AccountSettings from "../settings/AccountSettings";

function Bottombar() {
  return (
    <div className="absolute h-16 inset-x-4 bottom-0 flex flex-row items-center justify-between">
      {navbarLinks.map((item) => (
        <NavItem
          className=""
          variant="secondary"
          key={item.id}
          Icon={item.icon}
          title={item.title}
          url={item.url}
          dev={item.dev}
        />
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
  const stats = useMemo(() => {
    if (latestStats) {
      return latestStats;
    }

    return initialStats;
  }, [initialStats, latestStats]);
  const { potentialProblems } = useStats(stats);

  if (!potentialProblems || potentialProblems.length == 0) {
    return;
  }

  return (
    <Drawer>
      <DrawerTrigger>
        <IoIosWarning className="size-5 text-danger" />
      </DrawerTrigger>
      <DrawerContent className="max-h-[75dvh] px-2 mx-1 rounded-t-2xl overflow-hidden">
        <div className="w-full h-auto py-4 overflow-y-auto overflow-x-hidden flex flex-col items-center gap-2">
          {potentialProblems.map((prob) => (
            <div className="w-full flex items-center text-xs gap-2 capitalize">
              <IoIosWarning className={`size-5 ${prob.color}`} />
              {prob.text}
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default Bottombar;
