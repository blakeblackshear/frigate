import useSWR from "swr";
import { FrigateStats, GpuInfo } from "@/types/stats";
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
import GPUInfoDialog from "@/components/overlay/GPUInfoDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ThresholdBarGraph } from "@/components/graph/SystemGraph";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type GeneralMetricsProps = {
  lastUpdated: number;
  setLastUpdated: (last: number) => void;
};
export default function GeneralMetrics({
  lastUpdated,
  setLastUpdated,
}: GeneralMetricsProps) {
  // extra info
  const { t } = useTranslation(["views/system"]);
  const [showVainfo, setShowVainfo] = useState(false);

  // stats

  const { data: initialStats } = useSWR<FrigateStats[]>(
    [
      "stats/history",
      { keys: "cpu_usages,detectors,gpu_usages,npu_usages,processes,service" },
    ],
    {
      revalidateOnFocus: false,
    },
  );

  const [statsHistory, setStatsHistory] = useState<FrigateStats[]>([]);
  const updatedStats = useFrigateStats();

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
      setStatsHistory([...statsHistory.slice(1), updatedStats]);
      setLastUpdated(Date.now() / 1000);
    }
  }, [initialStats, updatedStats, statsHistory, lastUpdated, setLastUpdated]);

  const [canGetGpuInfo, gpuType] = useMemo<[boolean, GpuInfo]>(() => {
    let vaCount = 0;
    let nvCount = 0;

    statsHistory.length > 0 &&
      Object.keys(statsHistory[0]?.gpu_usages ?? {}).forEach((key) => {
        if (key == "amd-vaapi" || key == "intel-vaapi" || key == "intel-qsv") {
          vaCount += 1;
        }

        if (key.includes("NVIDIA")) {
          nvCount += 1;
        }
      });

    return [vaCount > 0 || nvCount > 0, nvCount > 0 ? "nvinfo" : "vainfo"];
  }, [statsHistory]);

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
      return undefined;
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
        if (!key.includes("coral")) {
          return;
        }

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

    if (Object.keys(series).length > 0) {
      return Object.values(series);
    }

    return undefined;
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

        const data = stats.cpu_usages[detStats.pid.toString()]?.cpu;

        if (data != undefined) {
          series[key].data.push({
            x: statsIdx + 1,
            y: data,
          });
        }
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

      Object.entries(stats.gpu_usages || {}).forEach(([key, stats]) => {
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

  const gpuEncSeries = useMemo(() => {
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

      Object.entries(stats.gpu_usages || {}).forEach(([key, stats]) => {
        if (!(key in series)) {
          series[key] = { name: key, data: [] };
        }

        if (stats.enc) {
          hasValidGpu = true;
          series[key].data.push({ x: statsIdx + 1, y: stats.enc.slice(0, -1) });
        }
      });
    });

    if (!hasValidGpu) {
      return [];
    }

    return Object.keys(series).length > 0 ? Object.values(series) : undefined;
  }, [statsHistory]);

  const gpuDecSeries = useMemo(() => {
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

      Object.entries(stats.gpu_usages || {}).forEach(([key, stats]) => {
        if (!(key in series)) {
          series[key] = { name: key, data: [] };
        }

        if (stats.dec) {
          hasValidGpu = true;
          series[key].data.push({ x: statsIdx + 1, y: stats.dec.slice(0, -1) });
        }
      });
    });

    if (!hasValidGpu) {
      return [];
    }

    return Object.keys(series).length > 0 ? Object.values(series) : undefined;
  }, [statsHistory]);

  // npu stats

  const npuSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: number; y: number }[] };
    } = {};
    let hasValidNpu = false;

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      Object.entries(stats.npu_usages || {}).forEach(([key, stats]) => {
        if (!(key in series)) {
          series[key] = { name: key, data: [] };
        }

        if (stats?.npu) {
          hasValidNpu = true;
          series[key].data.push({ x: statsIdx + 1, y: stats.npu });
        }
      });
    });

    if (!hasValidNpu) {
      return [];
    }

    return Object.keys(series).length > 0 ? Object.values(series) : [];
  }, [statsHistory]);

  // other processes stats

  const hardwareType = useMemo(() => {
    const hasGpu = gpuSeries.length > 0;
    const hasNpu = npuSeries.length > 0;

    if (hasGpu && !hasNpu) {
      return "GPUs";
    } else if (!hasGpu && hasNpu) {
      return "NPUs";
    } else {
      return "GPUs / NPUs";
    }
  }, [gpuSeries, npuSeries]);

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

          const data = stats.cpu_usages[procStats.pid.toString()]?.cpu;

          if (data != undefined) {
            series[key].data.push({
              x: statsIdx + 1,
              y: data,
            });
          }
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

          const data = stats.cpu_usages[procStats.pid.toString()]?.mem;

          if (data) {
            series[key].data.push({
              x: statsIdx + 1,
              y: data,
            });
          }
        }
      });
    });
    return Object.values(series);
  }, [statsHistory]);

  return (
    <>
      <GPUInfoDialog
        showGpuInfo={showVainfo}
        gpuType={gpuType}
        setShowGpuInfo={setShowVainfo}
      />

      <div className="scrollbar-container mt-4 flex size-full flex-col overflow-y-auto">
        <div className="text-sm font-medium text-muted-foreground">
          {t("general.detector.title")}
        </div>
        <div
          className={cn(
            "mt-4 grid w-full grid-cols-1 gap-2 sm:grid-cols-3",
            detTempSeries && "sm:grid-cols-4",
          )}
        >
          {statsHistory.length != 0 ? (
            <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
              <div className="mb-5">{t("general.detector.inferenceSpeed")}</div>
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
          {statsHistory.length != 0 && (
            <>
              {detTempSeries && (
                <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
                  <div className="mb-5">
                    {t("general.detector.temperature")}
                  </div>
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
          )}
          {statsHistory.length != 0 ? (
            <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
              <div className="mb-5">{t("general.detector.cpuUsage")}</div>
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
              <div className="mb-5">{t("general.detector.memoryUsage")}</div>
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

        {(statsHistory.length == 0 ||
          gpuSeries.length > 0 ||
          npuSeries.length > 0) && (
          <>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">
                {hardwareType}
              </div>
              {canGetGpuInfo && (
                <Button
                  className="cursor-pointer"
                  aria-label={t("general.hardwareInfo.title")}
                  size="sm"
                  onClick={() => setShowVainfo(true)}
                >
                  {t("general.hardwareInfo.title")}
                </Button>
              )}
            </div>
            <div
              className={cn(
                "mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2",
                gpuEncSeries?.length && "md:grid-cols-4",
              )}
            >
              {statsHistory[0]?.gpu_usages && (
                <>
                  {statsHistory.length != 0 ? (
                    <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
                      <div className="mb-5">
                        {t("general.hardwareInfo.gpuUsage")}
                      </div>
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
                          <div className="mb-5">
                            {t("general.hardwareInfo.gpuMemory")}
                          </div>
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
                  {statsHistory.length != 0 ? (
                    <>
                      {gpuEncSeries && gpuEncSeries?.length != 0 && (
                        <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
                          <div className="mb-5">
                            {t("general.hardwareInfo.gpuEncoder")}
                          </div>
                          {gpuEncSeries.map((series) => (
                            <ThresholdBarGraph
                              key={series.name}
                              graphId={`${series.name}-enc`}
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
                  {statsHistory.length != 0 ? (
                    <>
                      {gpuDecSeries && gpuDecSeries?.length != 0 && (
                        <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
                          <div className="mb-5">
                            {t("general.hardwareInfo.gpuDecoder")}
                          </div>
                          {gpuDecSeries.map((series) => (
                            <ThresholdBarGraph
                              key={series.name}
                              graphId={`${series.name}-dec`}
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
                </>
              )}
              {statsHistory[0]?.npu_usages && (
                <div
                  className={cn("mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2")}
                >
                  {statsHistory.length != 0 ? (
                    <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
                      <div className="mb-5">
                        {t("general.hardwareInfo.npuUsage")}
                      </div>
                      {npuSeries.map((series) => (
                        <ThresholdBarGraph
                          key={series.name}
                          graphId={`${series.name}-npu`}
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
                </div>
              )}
            </div>
          </>
        )}

        <div className="mt-4 text-sm font-medium text-muted-foreground">
          {t("general.otherProcesses.title")}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {statsHistory.length != 0 ? (
            <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
              <div className="mb-5">
                {t("general.otherProcesses.processCpuUsage")}
              </div>
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
              <div className="mb-5">
                {t("general.otherProcesses.processMemoryUsage")}
              </div>
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
