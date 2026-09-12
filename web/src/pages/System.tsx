import useSWR from "swr";
import { FrigateStats } from "@/types/stats";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Toaster } from "@/components/ui/sonner";
import { FrigateConfig } from "@/types/frigateConfig";
import EnrichmentMetrics from "@/views/system/EnrichmentMetrics";
import { useTranslation } from "react-i18next";

const allMetrics = ["general", "enrichments", "storage", "cameras"] as const;
type SystemMetric = (typeof allMetrics)[number];

function System() {
  const { t } = useTranslation(["views/system"]);
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  const metrics = useMemo(() => {
    const metrics = [...allMetrics];

    if (
      !config?.semantic_search.enabled &&
      !config?.lpr.enabled &&
      !config?.face_recognition.enabled
    ) {
      const index = metrics.indexOf("enrichments");
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
  const [lastUpdated, setLastUpdated] = useState<number>(
    Math.floor(Date.now() / 1000),
  );

  // Track which tabs have been visited so we can keep them mounted after first visit.
  // Using a ref updated during render avoids extra render cycles from state/effects.
  const visitedTabsRef = useRef(new Set<string>());
  if (page) {
    visitedTabsRef.current.add(page);
  }
  const visitedTabs = visitedTabsRef.current;

  useEffect(() => {
    if (pageToggle) {
      document.title = t("documentTitle." + pageToggle);
    }
  }, [pageToggle, t]);

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
              {item == "enrichments" && <LuSearchCode className="size-4" />}
              {item == "storage" && <LuHardDrive className="size-4" />}
              {item == "cameras" && <FaVideo className="size-4" />}
              {isDesktop && (
                <div className="smart-capitalize">{t(item + ".title")}</div>
              )}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex h-full items-center">
          {lastUpdated && (
            <div className="h-full content-center text-sm text-muted-foreground">
              {t("lastRefreshed")}
              <TimeAgo time={lastUpdated * 1000} dense />
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <div className="h-full content-center font-medium">{t("title")}</div>
        {statsSnapshot && (
          <div className="h-full content-center text-sm text-muted-foreground">
            {statsSnapshot.service.version}
          </div>
        )}
      </div>
      {visitedTabs.has("general") && (
        <div className={page == "general" ? "contents" : "hidden"}>
          <GeneralMetrics
            lastUpdated={lastUpdated}
            setLastUpdated={setLastUpdated}
            isActive={page == "general"}
          />
        </div>
      )}
      {metrics.includes("enrichments") && visitedTabs.has("enrichments") && (
        <div className={page == "enrichments" ? "contents" : "hidden"}>
          <EnrichmentMetrics
            lastUpdated={lastUpdated}
            setLastUpdated={setLastUpdated}
            isActive={page == "enrichments"}
          />
        </div>
      )}
      {visitedTabs.has("storage") && (
        <div className={page == "storage" ? "contents" : "hidden"}>
          <StorageMetrics setLastUpdated={setLastUpdated} />
        </div>
      )}
      {visitedTabs.has("cameras") && (
        <div className={page == "cameras" ? "contents" : "hidden"}>
          <CameraMetrics
            lastUpdated={lastUpdated}
            setLastUpdated={setLastUpdated}
            isActive={page == "cameras"}
          />
        </div>
      )}
    </div>
  );
}

export default System;
