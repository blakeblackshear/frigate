import useSWR from "swr";
import { FrigateStats } from "@/types/stats";
import { useEffect, useMemo, useState } from "react";
import SystemGraph from "@/components/graph/SystemGraph";
import { useFrigateStats } from "@/api/ws";
import TimeAgo from "@/components/dynamic/TimeAgo";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  DetectorCpuThreshold,
  DetectorMemThreshold,
  InferenceThreshold,
} from "@/types/graph";

function System() {
  const { data: config } = useSWR<FrigateConfig>("config");

  // stats chunks

  // stats collection

  const { data: initialStats } = useSWR<FrigateStats[]>("stats/history", {
    revalidateOnFocus: false,
  });
  const { payload: updatedStats } = useFrigateStats();
  const [statsHistory, setStatsHistory] = useState<FrigateStats[]>(
    initialStats || [],
  );

  const lastUpdated = useMemo(() => {
    if (updatedStats) {
      return updatedStats.service.last_updated;
    }

    if (initialStats) {
      return initialStats.at(-1)?.service?.last_updated;
    }

    return undefined;
  }, [initialStats, updatedStats]);

  useEffect(() => {
    if (initialStats == undefined) {
      return;
    }

    if (statsHistory.length < initialStats.length) {
      setStatsHistory(initialStats);
      return;
    }

    setStatsHistory([...statsHistory, updatedStats]);
  }, [initialStats, updatedStats]);

  // stats data pieces

  const detInferenceTimeSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: object; y: number }[] };
    } = {};

    statsHistory.forEach((stats) => {
      if (!stats) {
        return;
      }

      const statTime = new Date(stats.service.last_updated * 1000);

      Object.entries(stats.detectors).forEach(([key, stats]) => {
        if (!(key in series)) {
          series[key] = { name: `${key} (${stats.pid})`, data: [] };
        }

        series[key].data.push({ x: statTime, y: stats.inference_speed });
      });
    });
    return Object.values(series);
  }, [statsHistory]);
  const detCpuSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: object; y: string }[] };
    } = {};

    statsHistory.forEach((stats) => {
      if (!stats) {
        return;
      }

      const statTime = new Date(stats.service.last_updated * 1000);

      Object.entries(stats.detectors).forEach(([key, detStats]) => {
        if (!(key in series)) {
          series[key] = { name: key, data: [] };
        }

        series[key].data.push({
          x: statTime,
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
      [key: string]: { name: string; data: { x: object; y: string }[] };
    } = {};

    statsHistory.forEach((stats) => {
      if (!stats) {
        return;
      }

      const statTime = new Date(stats.service.last_updated * 1000);

      Object.entries(stats.detectors).forEach(([key, detStats]) => {
        if (!(key in series)) {
          series[key] = { name: key, data: [] };
        }

        series[key].data.push({
          x: statTime,
          y: stats.cpu_usages[detStats.pid.toString()].mem,
        });
      });
    });
    return Object.values(series);
  }, [statsHistory]);
  const gpuSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: object; y: string }[] };
    } = {};

    statsHistory.forEach((stats) => {
      if (!stats) {
        return;
      }

      const statTime = new Date(stats.service.last_updated * 1000);

      Object.entries(stats.gpu_usages || []).forEach(([key, stats]) => {
        if (!(key in series)) {
          series[key] = { name: key, data: [] };
        }

        series[key].data.push({ x: statTime, y: stats.gpu });
      });
    });
    return Object.keys(series).length > 0 ? Object.values(series) : [];
  }, [statsHistory]);
  const gpuMemSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: object; y: string }[] };
    } = {};

    statsHistory.forEach((stats) => {
      if (!stats) {
        return;
      }

      const statTime = new Date(stats.service.last_updated * 1000);

      Object.entries(stats.gpu_usages || {}).forEach(([key, stats]) => {
        if (!(key in series)) {
          series[key] = { name: key, data: [] };
        }

        series[key].data.push({ x: statTime, y: stats.mem });
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
        [key: string]: { name: string; data: { x: object; y: string }[] };
      };
    } = {};

    statsHistory.forEach((stats) => {
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
          x: statTime,
          y: stats.cpu_usages[camStats.ffmpeg_pid.toString()]?.cpu ?? 0.0,
        });
        series[key]["capture"].data.push({
          x: statTime,
          y: stats.cpu_usages[camStats.capture_pid?.toString()]?.cpu ?? 0,
        });
        series[key]["detect"].data.push({
          x: statTime,
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

    statsHistory.forEach((stats) => {
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
          x: statTime,
          y: camStats.detection_fps,
        });
        series[key]["skip"].data.push({
          x: statTime,
          y: camStats.skipped_fps,
        });
      });
    });
    return series;
  }, [statsHistory]);
  const otherProcessCpuSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: object; y: string }[] };
    } = {};

    statsHistory.forEach((stats) => {
      if (!stats) {
        return;
      }

      const statTime = new Date(stats.service.last_updated * 1000);

      Object.entries(stats.processes).forEach(([key, procStats]) => {
        if (procStats.pid.toString() in stats.cpu_usages) {
          if (!(key in series)) {
            series[key] = { name: `${key} (${procStats.pid})`, data: [] };
          }

          series[key].data.push({
            x: statTime,
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
      [key: string]: { name: string; data: { x: object; y: string }[] };
    } = {};

    statsHistory.forEach((stats) => {
      if (!stats) {
        return;
      }

      const statTime = new Date(stats.service.last_updated * 1000);

      Object.entries(stats.processes).forEach(([key, procStats]) => {
        if (procStats.pid.toString() in stats.cpu_usages) {
          if (!(key in series)) {
            series[key] = { name: key, data: [] };
          }

          series[key].data.push({
            x: statTime,
            y: stats.cpu_usages[procStats.pid.toString()].mem,
          });
        }
      });
    });
    return Object.values(series);
  }, [statsHistory]);

  return (
    <div className="size-full p-2">
      <div className="w-full h-8 flex justify-between items-center">
        <div className="h-full flex items-center gap-2">
          <div className="h-full font-medium content-center">System</div>
          {initialStats && (
            <div className="h-full text-muted-foreground text-sm content-center">
              {initialStats[0].service.version}
            </div>
          )}
        </div>
        <div className="h-full flex items-center">
          {lastUpdated && (
            <div className="h-full text-muted-foreground text-sm content-center">
              Last refreshed: <TimeAgo time={lastUpdated * 1000} dense />
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="p-2.5 bg-primary rounded-2xl flex-col">
          <div className="mb-5">Detector Inference Speed</div>
          {detInferenceTimeSeries.map((series) => (
            <SystemGraph
              key={series.name}
              graphId="detector-inference"
              name={series.name}
              unit="ms"
              threshold={InferenceThreshold}
              data={[series]}
            />
          ))}
        </div>
        <div className="p-2.5 bg-primary rounded-2xl flex-col">
          <div className="mb-5">Detector CPU Usage</div>
          {detCpuSeries.map((series) => (
            <SystemGraph
              key={series.name}
              graphId="detector-cpu-usages"
              unit="%"
              name={series.name}
              threshold={DetectorCpuThreshold}
              data={[series]}
            />
          ))}
        </div>
        <div className="p-2.5 bg-primary rounded-2xl flex-col">
          <div className="mb-5">Detector Memory Usage</div>
          {detMemSeries.map((series) => (
            <SystemGraph
              key={series.name}
              graphId="detector-mem-usages"
              unit="%"
              name={series.name}
              threshold={DetectorMemThreshold}
              data={[series]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default System;

/**
 *  <div className="bg-primary rounded-2xl flex-col">

        </div>
        <div className="bg-primary rounded-2xl flex-col">
          <SystemGraph
            graphId="detector-usages"
            unit="%"
            name={""}
            threshold={InferenceThreshold}
            data={detMemSeries}
          />
        </div>
 *
 *  <Heading as="h4">Detectors</Heading>
      <div className="grid grid-cols-1 sm:grid-cols-3">
        <SystemGraph
          graphId="detector-inference"
          title="Inference Speed"
          unit="ms"
          data={detInferenceTimeSeries}
        />
        <SystemGraph
          graphId="detector-usages"
          title="CPU"
          unit="%"
          data={detCpuSeries}
        />
        <SystemGraph
          graphId="detector-usages"
          title="Memory"
          unit="%"
          data={detMemSeries}
        />
      </div>
      {gpuSeries.length > 0 && (
        <>
          <Heading as="h4">GPUs</Heading>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2">
            <SystemGraph
              graphId="detector-inference"
              title="GPU Usage"
              unit="%"
              data={gpuSeries}
            />
            <SystemGraph
              graphId="detector-usages"
              title="GPU Memory"
              unit="%"
              data={gpuMemSeries}
            />
          </div>
        </>
      )}
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
      <Heading as="h4">Other Processes</Heading>
      <div className="grid grid-cols-1 sm:grid-cols-2">
        <SystemGraph
          graphId="process-cpu"
          title="CPU"
          unit="%"
          data={otherProcessCpuSeries}
        />
        <SystemGraph
          graphId="process-mem"
          title="Memory"
          unit="%"
          data={otherProcessMemSeries}
        />
      </div>
 */
