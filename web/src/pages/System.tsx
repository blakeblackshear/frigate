import useSWR from "swr";
import { FrigateStats } from "@/types/stats";
import { useState } from "react";
import TimeAgo from "@/components/dynamic/TimeAgo";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { isDesktop, isMobile } from "react-device-detect";
import GeneralMetrics from "@/views/system/GeneralMetrics";
import StorageMetrics from "@/views/system/StorageMetrics";
import { LuActivity, LuHardDrive } from "react-icons/lu";
import { FaVideo } from "react-icons/fa";
import Logo from "@/components/Logo";
import useOptimisticState from "@/hooks/use-optimistic-state";

const metrics = ["general", "storage", "cameras"] as const;
type SystemMetric = (typeof metrics)[number];

function System() {
  // stats page

  const [page, setPage] = useState<SystemMetric>("general");
  const [pageToggle, setPageToggle] = useOptimisticState(page, setPage, 100);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now() / 1000);

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
    </div>
  );
}

export default System;

/**
 * const cameraCpuSeries = useMemo(() => {
    if (!statsHistory || statsHistory.length == 0) {
      return {};
    }

    const series: {
      [cam: string]: {
        [key: string]: { name: string; data: { x: object; y: string }[] };
      };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      const statTime = new Date(stats.service.last_updated * 1000);

      Object.entries(stats.cameras).forEach(([key, camStats]) => {
        if (!config?.cameras[key].enabled) {
          return;
        }

        if (!(key in series)) {
          const camName = key.replaceAll("_", " ");
          series[key] = {};
          series[key]["ffmpeg"] = { name: `${camName} ffmpeg`, data: [] };
          series[key]["capture"] = { name: `${camName} capture`, data: [] };
          series[key]["detect"] = { name: `${camName} detect`, data: [] };
        }

        series[key]["ffmpeg"].data.push({
          x: statsIdx,
          y: stats.cpu_usages[camStats.ffmpeg_pid.toString()]?.cpu ?? 0.0,
        });
        series[key]["capture"].data.push({
          x: statsIdx,
          y: stats.cpu_usages[camStats.capture_pid?.toString()]?.cpu ?? 0,
        });
        series[key]["detect"].data.push({
          x: statsIdx,
          y: stats.cpu_usages[camStats.pid.toString()].cpu,
        });
      });
    });
    return series;
  }, [statsHistory]);
  const cameraFpsSeries = useMemo(() => {
    if (!statsHistory) {
      return {};
    }

    const series: {
      [cam: string]: {
        [key: string]: { name: string; data: { x: object; y: number }[] };
      };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      const statTime = new Date(stats.service.last_updated * 1000);

      Object.entries(stats.cameras).forEach(([key, camStats]) => {
        if (!(key in series)) {
          const camName = key.replaceAll("_", " ");
          series[key] = {};
          series[key]["det"] = { name: `${camName} detections`, data: [] };
          series[key]["skip"] = {
            name: `${camName} skipped detections`,
            data: [],
          };
        }

        series[key]["det"].data.push({
          x: statsIdx,
          y: camStats.detection_fps,
        });
        series[key]["skip"].data.push({
          x: statsIdx,
          y: camStats.skipped_fps,
        });
      });
    });
    return series;
  }, [statsHistory]);
 *
 *  <div className="bg-primary rounded-2xl flex-col">
      <Heading as="h4">Cameras</Heading>
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {config &&
          Object.values(config.cameras).map((camera) => {
            if (camera.enabled) {
              return (
                <div key={camera.name} className="grid grid-cols-2">
                  <ThresholdBarGraph
                    graphId={`${camera.name}-cpu`}
                    title={`${camera.name.replaceAll("_", " ")} CPU`}
                    unit="%"
                    data={Object.values(cameraCpuSeries[camera.name] || {})}
                  />
                  <ThresholdBarGraph
                    graphId={`${camera.name}-fps`}
                    title={`${camera.name.replaceAll("_", " ")} FPS`}
                    unit=""
                    data={Object.values(cameraFpsSeries[camera.name] || {})}
                  />
                </div>
              );
            }

            return null;
          })}
      </div>
 */
