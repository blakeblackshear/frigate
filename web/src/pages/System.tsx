import useSWR from "swr";
import { FrigateStats } from "@/types/stats";
import { useEffect, useMemo, useState } from "react";
import TimeAgo from "@/components/dynamic/TimeAgo";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { isDesktop, isMobile } from "react-device-detect";
import GeneralMetrics from "@/views/system/GeneralMetrics";
import StorageMetrics from "@/views/system/StorageMetrics";
import { LuActivity, LuHardDrive, LuSearchCode } from "react-icons/lu";
import { FaVideo } from "react-icons/fa";
import Logo from "@/components/Logo";
import useOptimisticState from "@/hooks/use-optimistic-state";
import CameraMetrics from "@/views/system/CameraMetrics";
import { useHashState } from "@/hooks/use-overlay-state";
import { capitalizeFirstLetter } from "@/utils/stringUtil";
import { Toaster } from "@/components/ui/sonner";
import { FrigateConfig } from "@/types/frigateConfig";
import FeatureMetrics from "@/views/system/FeatureMetrics";

const allMetrics = ["general", "features", "storage", "cameras"] as const;
type SystemMetric = (typeof allMetrics)[number];

function System() {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  const metrics = useMemo(() => {
    const metrics = [...allMetrics];

    if (!config?.semantic_search.enabled) {
      const index = metrics.indexOf("features");
      metrics.splice(index, 1);
    }

    return metrics;
  }, [config]);

  // stats page

  const [page, setPage] = useHashState<SystemMetric>();
  const [pageToggle, setPageToggle] = useOptimisticState(
    page ?? "general",
    setPage,
    100,
  );
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now() / 1000);

  useEffect(() => {
    if (pageToggle) {
      document.title = `${capitalizeFirstLetter(pageToggle)} Stats - Frigate`;
    }
  }, [pageToggle]);

  // stats collection

  const { data: statsSnapshot } = useSWR<FrigateStats>("stats", {
    revalidateOnFocus: false,
  });

  return (
    <div className="flex size-full flex-col p-2">
      <Toaster position="top-center" />
      <div className="relative flex h-11 w-full items-center justify-between">
        {isMobile && (
          <Logo className="absolute inset-x-1/2 h-8 -translate-x-1/2" />
        )}
        <ToggleGroup
          className="*:rounded-md *:px-3 *:py-4"
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
              className={`flex items-center justify-between gap-2 ${pageToggle == item ? "" : "*:text-muted-foreground"}`}
              value={item}
              aria-label={`Select ${item}`}
            >
              {item == "general" && <LuActivity className="size-4" />}
              {item == "features" && <LuSearchCode className="size-4" />}
              {item == "storage" && <LuHardDrive className="size-4" />}
              {item == "cameras" && <FaVideo className="size-4" />}
              {isDesktop && <div className="capitalize">{item}</div>}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex h-full items-center">
          {lastUpdated && (
            <div className="h-full content-center text-sm text-muted-foreground">
              Last refreshed: <TimeAgo time={lastUpdated * 1000} dense />
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <div className="h-full content-center font-medium">System</div>
        {statsSnapshot && (
          <div className="h-full content-center text-sm text-muted-foreground">
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
      {page == "features" && (
        <FeatureMetrics
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
