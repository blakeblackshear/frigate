import useSWR from "swr";
import { FrigateStats } from "@/types/stats";
import { useEffect, useState } from "react";
import TimeAgo from "@/components/dynamic/TimeAgo";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { isDesktop, isMobile } from "react-device-detect";
import GeneralMetrics from "@/views/system/GeneralMetrics";
import StorageMetrics from "@/views/system/StorageMetrics";
import { LuActivity, LuHardDrive } from "react-icons/lu";
import { FaVideo } from "react-icons/fa";
import Logo from "@/components/Logo";
import useOptimisticState from "@/hooks/use-optimistic-state";
import CameraMetrics from "@/views/system/CameraMetrics";

const metrics = ["general", "storage", "cameras"] as const;
type SystemMetric = (typeof metrics)[number];

function System() {
  // stats page

  const [page, setPage] = useState<SystemMetric>("general");
  const [pageToggle, setPageToggle] = useOptimisticState(page, setPage, 100);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now() / 1000);

  useEffect(() => {
    document.title = `${pageToggle[0].toUpperCase()}${pageToggle.substring(1)} Stats - Frigate`;
  }, [pageToggle]);

  // stats collection

  const { data: statsSnapshot } = useSWR<FrigateStats>("stats", {
    revalidateOnFocus: false,
  });

  return (
    <div className="size-full p-2 flex flex-col">
      <div className="w-full h-11 relative flex justify-between items-center">
        {isMobile && (
          <Logo className="absolute inset-x-1/2 -translate-x-1/2 h-8" />
        )}
        <ToggleGroup
          className="*:px-3 *:py-4 *:rounded-md"
          type="single"
          size="sm"
          value={pageToggle}
          onValueChange={(value: SystemMetric) => {
            if (value) {
              setPageToggle(value);
            }
          }} // don't allow the severity to be unselected
        >
          {Object.values(metrics).map((item) => (
            <ToggleGroupItem
              key={item}
              className={`flex items-center justify-between gap-2 ${pageToggle == item ? "" : "*:text-gray-500"}`}
              value={item}
              aria-label={`Select ${item}`}
            >
              {item == "general" && <LuActivity className="size-4" />}
              {item == "storage" && <LuHardDrive className="size-4" />}
              {item == "cameras" && <FaVideo className="size-4" />}
              {isDesktop && <div className="capitalize">{item}</div>}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="h-full flex items-center">
          {lastUpdated && (
            <div className="h-full text-muted-foreground text-sm content-center">
              Last refreshed: <TimeAgo time={lastUpdated * 1000} dense />
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <div className="h-full font-medium content-center">System</div>
        {statsSnapshot && (
          <div className="h-full text-muted-foreground text-sm content-center">
            {statsSnapshot.service.version}
          </div>
        )}
      </div>
      {page == "general" && (
        <GeneralMetrics
          lastUpdated={lastUpdated}
          setLastUpdated={setLastUpdated}
        />
      )}
      {page == "storage" && <StorageMetrics setLastUpdated={setLastUpdated} />}
      {page == "cameras" && (
        <CameraMetrics
          lastUpdated={lastUpdated}
          setLastUpdated={setLastUpdated}
        />
      )}
    </div>
  );
}

export default System;
