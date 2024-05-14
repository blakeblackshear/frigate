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
    ["stats/history", { keys: "cpu_usages,cameras,detection_fps,service" }],
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

  const overallFpsSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: number; y: number }[] };
    } = {};

    series["overall_fps"] = { name: "overall frames per second", data: [] };
    series["overall_dps"] = { name: "overall detections per second", data: [] };
    series["overall_skipped_dps"] = {
      name: "overall skipped detections per second",
      data: [],
    };

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      let frames = 0;
      Object.values(stats.cameras).forEach(
        (camStat) => (frames += camStat.camera_fps),
      );

      series["overall_fps"].data.push({
        x: statsIdx,
        y: Math.round(frames),
      });

      series["overall_dps"].data.push({
        x: statsIdx,
        y: stats.detection_fps,
      });

      let skipped = 0;
      Object.values(stats.cameras).forEach(
        (camStat) => (skipped += camStat.skipped_fps),
      );

      series["overall_skipped_dps"].data.push({
        x: statsIdx,
        y: skipped,
      });
    });
    return Object.values(series);
  }, [statsHistory]);

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
          series[key]["fps"] = {
            name: `${camName} frames per second`,
            data: [],
          };
          series[key]["det"] = {
            name: `${camName} detections per second`,
            data: [],
          };
          series[key]["skip"] = {
            name: `${camName} skipped detections per second`,
            data: [],
          };
        }

        series[key]["fps"].data.push({
          x: statsIdx,
          y: camStats.camera_fps,
        });
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
    <div className="mt-4 flex size-full flex-col gap-3 overflow-y-auto">
      <div className="text-sm font-medium text-muted-foreground">Overview</div>
      <div className="grid grid-cols-1 md:grid-cols-3">
        {statsHistory.length != 0 ? (
          <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
            <div className="mb-5">Frames / Detections</div>
            <CameraLineGraph
              graphId="overall-stats"
              unit=""
              dataLabels={["camera", "detect", "skipped"]}
              updateTimes={updateTimes}
              data={overallFpsSeries}
            />
          </div>
        ) : (
          <Skeleton className="h-32 w-full rounded-lg md:rounded-2xl" />
        )}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {config &&
          Object.values(config.cameras).map((camera) => {
            if (camera.enabled) {
              return (
                <div className="flex w-full flex-col gap-3">
                  <div className="text-sm font-medium capitalize text-muted-foreground">
                    {camera.name.replaceAll("_", " ")}
                  </div>
                  <div key={camera.name} className="grid gap-2 sm:grid-cols-2">
                    {Object.keys(cameraCpuSeries).includes(camera.name) ? (
                      <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
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
                      <Skeleton className="aspect-video size-full" />
                    )}
                    {Object.keys(cameraFpsSeries).includes(camera.name) ? (
                      <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
                        <div className="mb-5">Frames / Detections</div>
                        <CameraLineGraph
                          graphId={`${camera.name}-dps`}
                          unit=""
                          dataLabels={["camera", "detect", "skipped"]}
                          updateTimes={updateTimes}
                          data={Object.values(
                            cameraFpsSeries[camera.name] || {},
                          )}
                        />
                      </div>
                    ) : (
                      <Skeleton className="aspect-video size-full" />
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
