import { useFrigateStats } from "@/api/ws";
import { CameraLineGraph } from "@/components/graph/SystemGraph";
import { Skeleton } from "@/components/ui/skeleton";
import { FrigateConfig } from "@/types/frigateConfig";
import { FrigateStats } from "@/types/stats";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

type CameraMetricsProps = {
  lastUpdated: number;
  setLastUpdated: (last: number) => void;
};
export default function CameraMetrics({
  lastUpdated,
  setLastUpdated,
}: CameraMetricsProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  // stats

  const { data: initialStats } = useSWR<FrigateStats[]>(
    ["stats/history", { keys: "cpu_usages,cameras,service" }],
    {
      revalidateOnFocus: false,
    },
  );

  const [statsHistory, setStatsHistory] = useState<FrigateStats[]>([]);
  const { payload: updatedStats } = useFrigateStats();

  useEffect(() => {
    if (initialStats == undefined || initialStats.length == 0) {
      return;
    }

    if (statsHistory.length == 0) {
      setStatsHistory(initialStats);
      return;
    }

    if (!updatedStats) {
      return;
    }

    if (updatedStats.service.last_updated > lastUpdated) {
      setStatsHistory([...statsHistory, updatedStats]);
      setLastUpdated(Date.now() / 1000);
    }
  }, [initialStats, updatedStats, statsHistory, lastUpdated, setLastUpdated]);

  // timestamps

  const updateTimes = useMemo(
    () => statsHistory.map((stats) => stats.service.last_updated),
    [statsHistory],
  );

  // stats data

  const cameraCpuSeries = useMemo(() => {
    if (!statsHistory || statsHistory.length == 0) {
      return {};
    }

    const series: {
      [cam: string]: {
        [key: string]: { name: string; data: { x: number; y: string }[] };
      };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

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
  }, [config, statsHistory]);

  const cameraFpsSeries = useMemo(() => {
    if (!statsHistory) {
      return {};
    }

    const series: {
      [cam: string]: {
        [key: string]: { name: string; data: { x: number; y: number }[] };
      };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      Object.entries(stats.cameras).forEach(([key, camStats]) => {
        if (!(key in series)) {
          const camName = key.replaceAll("_", " ");
          series[key] = {};
          series[key]["det"] = {
            name: `${camName} detections per second`,
            data: [],
          };
          series[key]["skip"] = {
            name: `${camName} skipped detections per second`,
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

  return (
    <div className="size-full mt-4 flex flex-col overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {config &&
          Object.values(config.cameras).map((camera) => {
            if (camera.enabled) {
              return (
                <div className="w-full flex flex-col">
                  <div className="mb-6 capitalize">
                    {camera.name.replaceAll("_", " ")}
                  </div>
                  <div key={camera.name} className="grid sm:grid-cols-2 gap-2">
                    {Object.keys(cameraCpuSeries).includes(camera.name) ? (
                      <div className="p-2.5 bg-background_alt rounded-2xl flex-col">
                        <div className="mb-5">CPU</div>
                        <CameraLineGraph
                          graphId={`${camera.name}-cpu`}
                          unit="%"
                          dataLabels={["ffmpeg", "capture", "detect"]}
                          updateTimes={updateTimes}
                          data={Object.values(
                            cameraCpuSeries[camera.name] || {},
                          )}
                        />
                      </div>
                    ) : (
                      <Skeleton className="size-full aspect-video" />
                    )}
                    {Object.keys(cameraFpsSeries).includes(camera.name) ? (
                      <div className="p-2.5 bg-background_alt rounded-2xl flex-col">
                        <div className="mb-5">DPS</div>
                        <CameraLineGraph
                          graphId={`${camera.name}-dps`}
                          unit=" DPS"
                          dataLabels={["detect", "skipped"]}
                          updateTimes={updateTimes}
                          data={Object.values(
                            cameraFpsSeries[camera.name] || {},
                          )}
                        />
                      </div>
                    ) : (
                      <Skeleton className="size-full aspect-video" />
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })}
      </div>
    </div>
  );
}
