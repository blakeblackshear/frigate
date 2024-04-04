import useSWR from "swr";
import { FrigateStats } from "@/types/stats";
import { useEffect, useMemo, useState } from "react";
import SystemGraph from "@/components/graph/SystemGraph";
import { useFrigateStats } from "@/api/ws";
import TimeAgo from "@/components/dynamic/TimeAgo";
import {
  DetectorCpuThreshold,
  DetectorMemThreshold,
  GPUMemThreshold,
  GPUUsageThreshold,
  InferenceThreshold,
} from "@/types/graph";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import VainfoDialog from "@/components/overlay/VainfoDialog";

const metrics = ["general", "storage", "cameras"] as const;
type SystemMetric = (typeof metrics)[number];

function System() {
  // stats page

  const [page, setPage] = useState<SystemMetric>("general");
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now() / 1000);

  // stats collection

  const { data: statsSnapshot } = useSWR<FrigateStats>("stats", {
    revalidateOnFocus: false,
  });

  return (
    <div className="size-full p-2 flex flex-col">
      <div className="w-full h-8 flex justify-between items-center">
        <ToggleGroup
          className="*:px-3 *:py-4 *:rounded-md"
          type="single"
          size="sm"
          value={page}
          onValueChange={(value: SystemMetric) => {
            if (value) {
              setPage(value);
            }
          }} // don't allow the severity to be unselected
        >
          {Object.values(metrics).map((item) => (
            <ToggleGroupItem
              key={item}
              className={`flex items-center justify-between gap-2 ${page == item ? "" : "text-gray-500"}`}
              value={item}
              aria-label={`Select ${item}`}
            >
              <div className="capitalize">{item}</div>
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
                  <SystemGraph
                    graphId={`${camera.name}-cpu`}
                    title={`${camera.name.replaceAll("_", " ")} CPU`}
                    unit="%"
                    data={Object.values(cameraCpuSeries[camera.name] || {})}
                  />
                  <SystemGraph
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

type GeneralMetricsProps = {
  lastUpdated: number;
  setLastUpdated: (last: number) => void;
};
function GeneralMetrics({ lastUpdated, setLastUpdated }: GeneralMetricsProps) {
  // extra info

  const [showVainfo, setShowVainfo] = useState(false);

  // stats

  const { data: initialStats } = useSWR<FrigateStats[]>(
    [
      "stats/history",
      { keys: "cpu_usages,detectors,gpu_usages,processes,service" },
    ],
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

  // detectors stats

  const detInferenceTimeSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: number; y: number }[] };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      Object.entries(stats.detectors).forEach(([key, stats]) => {
        if (!(key in series)) {
          series[key] = { name: key, data: [] };
        }

        series[key].data.push({ x: statsIdx, y: stats.inference_speed });
      });
    });
    return Object.values(series);
  }, [statsHistory]);

  const detCpuSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: number; y: string }[] };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      Object.entries(stats.detectors).forEach(([key, detStats]) => {
        if (!(key in series)) {
          series[key] = { name: key, data: [] };
        }

        series[key].data.push({
          x: statsIdx,
          y: stats.cpu_usages[detStats.pid.toString()].cpu,
        });
      });
    });
    return Object.values(series);
  }, [statsHistory]);

  const detMemSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: number; y: string }[] };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      Object.entries(stats.detectors).forEach(([key, detStats]) => {
        if (!(key in series)) {
          series[key] = { name: key, data: [] };
        }

        series[key].data.push({
          x: statsIdx,
          y: stats.cpu_usages[detStats.pid.toString()].mem,
        });
      });
    });
    return Object.values(series);
  }, [statsHistory]);

  // gpu stats

  const gpuSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: number; y: string }[] };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      Object.entries(stats.gpu_usages || []).forEach(([key, stats]) => {
        if (!(key in series)) {
          series[key] = { name: key, data: [] };
        }

        series[key].data.push({ x: statsIdx, y: stats.gpu });
      });
    });
    return Object.keys(series).length > 0 ? Object.values(series) : [];
  }, [statsHistory]);

  const gpuMemSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: number; y: string }[] };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      Object.entries(stats.gpu_usages || {}).forEach(([key, stats]) => {
        if (!(key in series)) {
          series[key] = { name: key, data: [] };
        }

        series[key].data.push({ x: statsIdx, y: stats.mem });
      });
    });
    return Object.values(series);
  }, [statsHistory]);

  // other processes stats

  const otherProcessCpuSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: number; y: string }[] };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      Object.entries(stats.processes).forEach(([key, procStats]) => {
        if (procStats.pid.toString() in stats.cpu_usages) {
          if (!(key in series)) {
            series[key] = { name: key, data: [] };
          }

          series[key].data.push({
            x: statsIdx,
            y: stats.cpu_usages[procStats.pid.toString()].cpu,
          });
        }
      });
    });
    return Object.keys(series).length > 0 ? Object.values(series) : [];
  }, [statsHistory]);

  const otherProcessMemSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: number; y: string }[] };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      Object.entries(stats.processes).forEach(([key, procStats]) => {
        if (procStats.pid.toString() in stats.cpu_usages) {
          if (!(key in series)) {
            series[key] = { name: key, data: [] };
          }

          series[key].data.push({
            x: statsIdx,
            y: stats.cpu_usages[procStats.pid.toString()].mem,
          });
        }
      });
    });
    return Object.values(series);
  }, [statsHistory]);

  if (statsHistory.length == 0) {
    return;
  }

  return (
    <>
      <VainfoDialog showVainfo={showVainfo} setShowVainfo={setShowVainfo} />

      <div className="size-full mt-4 flex flex-col overflow-y-auto">
        <div className="text-muted-foreground text-sm font-medium">
          Detectors
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="p-2.5 bg-primary rounded-2xl flex-col">
            <div className="mb-5">Detector Inference Speed</div>
            {detInferenceTimeSeries.map((series) => (
              <SystemGraph
                key={series.name}
                graphId={`${series.name}-inference`}
                name={series.name}
                unit="ms"
                threshold={InferenceThreshold}
                updateTimes={updateTimes}
                data={[series]}
              />
            ))}
          </div>
          <div className="p-2.5 bg-primary rounded-2xl flex-col">
            <div className="mb-5">Detector CPU Usage</div>
            {detCpuSeries.map((series) => (
              <SystemGraph
                key={series.name}
                graphId={`${series.name}-cpu`}
                unit="%"
                name={series.name}
                threshold={DetectorCpuThreshold}
                updateTimes={updateTimes}
                data={[series]}
              />
            ))}
          </div>
          <div className="p-2.5 bg-primary rounded-2xl flex-col">
            <div className="mb-5">Detector Memory Usage</div>
            {detMemSeries.map((series) => (
              <SystemGraph
                key={series.name}
                graphId={`${series.name}-mem`}
                unit="%"
                name={series.name}
                threshold={DetectorMemThreshold}
                updateTimes={updateTimes}
                data={[series]}
              />
            ))}
          </div>
        </div>

        {statsHistory.length > 0 && statsHistory[0].gpu_usages && (
          <>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-muted-foreground text-sm font-medium">
                GPUs
              </div>
              {Object.keys(statsHistory[0].gpu_usages).filter(
                (key) =>
                  key == "amd-vaapi" ||
                  key == "intel-vaapi" ||
                  key == "intel-qsv",
              ).length > 0 && (
                <Button
                  className="cursor-pointer"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowVainfo(true)}
                >
                  Hardware Info
                </Button>
              )}
            </div>
            <div className=" mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 bg-primary rounded-2xl flex-col">
                <div className="mb-5">GPU Usage</div>
                {gpuSeries.map((series) => (
                  <SystemGraph
                    key={series.name}
                    graphId={`${series.name}-gpu`}
                    name={series.name}
                    unit=""
                    threshold={GPUUsageThreshold}
                    updateTimes={updateTimes}
                    data={[series]}
                  />
                ))}
              </div>
              <div className="p-2.5 bg-primary rounded-2xl flex-col">
                <div className="mb-5">GPU Memory</div>
                {gpuMemSeries.map((series) => (
                  <SystemGraph
                    key={series.name}
                    graphId={`${series.name}-mem`}
                    unit=""
                    name={series.name}
                    threshold={GPUMemThreshold}
                    updateTimes={updateTimes}
                    data={[series]}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        <div className="mt-4 text-muted-foreground text-sm font-medium">
          Other Processes
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="p-2.5 bg-primary rounded-2xl flex-col">
            <div className="mb-5">Process CPU Usage</div>
            {otherProcessCpuSeries.map((series) => (
              <SystemGraph
                key={series.name}
                graphId={`${series.name}-cpu`}
                name={series.name.replaceAll("_", " ")}
                unit="%"
                threshold={DetectorCpuThreshold}
                updateTimes={updateTimes}
                data={[series]}
              />
            ))}
          </div>
          <div className="p-2.5 bg-primary rounded-2xl flex-col">
            <div className="mb-5">Process Memory Usage</div>
            {otherProcessMemSeries.map((series) => (
              <SystemGraph
                key={series.name}
                graphId={`${series.name}-mem`}
                unit="%"
                name={series.name.replaceAll("_", " ")}
                threshold={DetectorMemThreshold}
                updateTimes={updateTimes}
                data={[series]}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
