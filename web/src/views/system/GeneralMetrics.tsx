import useSWR from "swr";
import { FrigateStats } from "@/types/stats";
import { useEffect, useMemo, useState } from "react";
import { useFrigateStats } from "@/api/ws";
import {
  DetectorCpuThreshold,
  DetectorMemThreshold,
  DetectorTempThreshold,
  GPUMemThreshold,
  GPUUsageThreshold,
  InferenceThreshold,
} from "@/types/graph";
import { Button } from "@/components/ui/button";
import VainfoDialog from "@/components/overlay/VainfoDialog";
import { ThresholdBarGraph } from "@/components/graph/SystemGraph";
import { Skeleton } from "@/components/ui/skeleton";

type GeneralMetricsProps = {
  lastUpdated: number;
  setLastUpdated: (last: number) => void;
};
export default function GeneralMetrics({
  lastUpdated,
  setLastUpdated,
}: GeneralMetricsProps) {
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

  const canGetGpuInfo = useMemo(
    () =>
      statsHistory.length > 0 &&
      Object.keys(statsHistory[0]?.gpu_usages ?? {}).filter(
        (key) =>
          key == "amd-vaapi" || key == "intel-vaapi" || key == "intel-qsv",
      ).length > 0,
    [statsHistory],
  );

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

        series[key].data.push({ x: statsIdx + 1, y: stats.inference_speed });
      });
    });
    return Object.values(series);
  }, [statsHistory]);

  const detTempSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    if (
      statsHistory.length > 0 &&
      Object.keys(statsHistory[0].service.temperatures).length == 0
    ) {
      return undefined;
    }

    const series: {
      [key: string]: { name: string; data: { x: number; y: number }[] };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      Object.entries(stats.detectors).forEach(([key], cIdx) => {
        if (cIdx <= Object.keys(stats.service.temperatures).length) {
          if (!(key in series)) {
            series[key] = {
              name: key,
              data: [],
            };
          }

          const temp = Object.values(stats.service.temperatures)[cIdx];
          series[key].data.push({ x: statsIdx + 1, y: Math.round(temp) });
        }
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
          x: statsIdx + 1,
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
          x: statsIdx + 1,
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
    let hasValidGpu = false;

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      Object.entries(stats.gpu_usages || []).forEach(([key, stats]) => {
        if (!(key in series)) {
          series[key] = { name: key, data: [] };
        }

        if (stats.gpu) {
          hasValidGpu = true;
          series[key].data.push({ x: statsIdx + 1, y: stats.gpu.slice(0, -1) });
        }
      });
    });

    if (!hasValidGpu) {
      return [];
    }

    return Object.keys(series).length > 0 ? Object.values(series) : [];
  }, [statsHistory]);

  const gpuMemSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    if (
      Object.keys(statsHistory?.at(0)?.gpu_usages ?? {}).length == 1 &&
      Object.keys(statsHistory?.at(0)?.gpu_usages ?? {})[0].includes("intel")
    ) {
      // intel gpu stats do not support memory
      return undefined;
    }

    const series: {
      [key: string]: { name: string; data: { x: number; y: string }[] };
    } = {};
    let hasValidGpu = false;

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      Object.entries(stats.gpu_usages || {}).forEach(([key, stats]) => {
        if (!(key in series)) {
          series[key] = { name: key, data: [] };
        }

        if (stats.mem) {
          hasValidGpu = true;
          series[key].data.push({ x: statsIdx + 1, y: stats.mem.slice(0, -1) });
        }
      });
    });

    if (!hasValidGpu) {
      return [];
    }

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
            x: statsIdx + 1,
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
            x: statsIdx + 1,
            y: stats.cpu_usages[procStats.pid.toString()].mem,
          });
        }
      });
    });
    return Object.values(series);
  }, [statsHistory]);

  return (
    <>
      <VainfoDialog showVainfo={showVainfo} setShowVainfo={setShowVainfo} />

      <div className="mt-4 flex size-full flex-col overflow-y-auto">
        <div className="text-sm font-medium text-muted-foreground">
          Detectors
        </div>
        <div
          className={`mt-4 grid w-full grid-cols-1 gap-2 ${detTempSeries == undefined ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}
        >
          {statsHistory.length != 0 ? (
            <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
              <div className="mb-5">Detector Inference Speed</div>
              {detInferenceTimeSeries.map((series) => (
                <ThresholdBarGraph
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
          ) : (
            <Skeleton className="aspect-video w-full rounded-lg md:rounded-2xl" />
          )}
          {statsHistory.length != 0 ? (
            <>
              {detTempSeries && (
                <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
                  <div className="mb-5">Detector Temperature</div>
                  {detTempSeries.map((series) => (
                    <ThresholdBarGraph
                      key={series.name}
                      graphId={`${series.name}-temp`}
                      name={series.name}
                      unit="°C"
                      threshold={DetectorTempThreshold}
                      updateTimes={updateTimes}
                      data={[series]}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <Skeleton className="aspect-video w-full" />
          )}
          {statsHistory.length != 0 ? (
            <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
              <div className="mb-5">Detector CPU Usage</div>
              {detCpuSeries.map((series) => (
                <ThresholdBarGraph
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
          ) : (
            <Skeleton className="aspect-video w-full" />
          )}
          {statsHistory.length != 0 ? (
            <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
              <div className="mb-5">Detector Memory Usage</div>
              {detMemSeries.map((series) => (
                <ThresholdBarGraph
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
          ) : (
            <Skeleton className="aspect-video w-full" />
          )}
        </div>

        {(statsHistory.length == 0 || statsHistory[0].gpu_usages) && (
          <>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">
                GPUs
              </div>
              {canGetGpuInfo && (
                <Button
                  className="cursor-pointer"
                  size="sm"
                  onClick={() => setShowVainfo(true)}
                >
                  Hardware Info
                </Button>
              )}
            </div>
            <div className=" mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {statsHistory.length != 0 ? (
                <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
                  <div className="mb-5">GPU Usage</div>
                  {gpuSeries.map((series) => (
                    <ThresholdBarGraph
                      key={series.name}
                      graphId={`${series.name}-gpu`}
                      name={series.name}
                      unit="%"
                      threshold={GPUUsageThreshold}
                      updateTimes={updateTimes}
                      data={[series]}
                    />
                  ))}
                </div>
              ) : (
                <Skeleton className="aspect-video w-full" />
              )}
              {statsHistory.length != 0 ? (
                <>
                  {gpuMemSeries && (
                    <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
                      <div className="mb-5">GPU Memory</div>
                      {gpuMemSeries.map((series) => (
                        <ThresholdBarGraph
                          key={series.name}
                          graphId={`${series.name}-mem`}
                          unit="%"
                          name={series.name}
                          threshold={GPUMemThreshold}
                          updateTimes={updateTimes}
                          data={[series]}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Skeleton className="aspect-video w-full" />
              )}
            </div>
          </>
        )}

        <div className="mt-4 text-sm font-medium text-muted-foreground">
          Other Processes
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {statsHistory.length != 0 ? (
            <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
              <div className="mb-5">Process CPU Usage</div>
              {otherProcessCpuSeries.map((series) => (
                <ThresholdBarGraph
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
          ) : (
            <Skeleton className="aspect-tall w-full" />
          )}
          {statsHistory.length != 0 ? (
            <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
              <div className="mb-5">Process Memory Usage</div>
              {otherProcessMemSeries.map((series) => (
                <ThresholdBarGraph
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
          ) : (
            <Skeleton className="aspect-tall w-full" />
          )}
        </div>
      </div>
    </>
  );
}
