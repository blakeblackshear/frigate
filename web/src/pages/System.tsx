import Heading from "@/components/ui/heading";
import useSWR from "swr";
import { FrigateStats } from "@/types/stats";
import { useEffect, useMemo, useState } from "react";
import SystemGraph from "@/components/graph/SystemGraph";
import { useFrigateStats } from "@/api/ws";
import TimeAgo from "@/components/dynamic/TimeAgo";

function System() {
  // stats
  const { data: initialStats } = useSWR<FrigateStats[]>("stats/history", {
    revalidateOnFocus: false,
  });
  const { payload: updatedStats } = useFrigateStats();
  const [statsHistory, setStatsHistory] = useState<FrigateStats[]>(
    initialStats || []
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
      [key: string]: { name: string; data: { x: any; y: any }[] };
    } = {};

    statsHistory.forEach((stats) => {
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
      [key: string]: { name: string; data: { x: any; y: any }[] };
    } = {};

    statsHistory.forEach((stats) => {
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
      [key: string]: { name: string; data: { x: any; y: any }[] };
    } = {};

    statsHistory.forEach((stats) => {
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
      [key: string]: { name: string; data: { x: any; y: any }[] };
    } = {};

    statsHistory.forEach((stats) => {
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
      [key: string]: { name: string; data: { x: any; y: any }[] };
    } = {};

    statsHistory.forEach((stats) => {
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
  const otherProcessCpuSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: any; y: any }[] };
    } = {};

    statsHistory.forEach((stats) => {
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
      [key: string]: { name: string; data: { x: any; y: any }[] };
    } = {};

    statsHistory.forEach((stats) => {
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
    <>
      <div className="flex items-center">
        <Heading as="h2">System</Heading>
        {initialStats && (
          <div className="ml-2 text-sm">{initialStats[0].service.version}</div>
        )}
      </div>
      {lastUpdated && (
        <div className="text-xs mb-2">
          Last refreshed: <TimeAgo time={lastUpdated * 1000} dense />
        </div>
      )}

      <Heading as="h4">Detectors</Heading>
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
          <div className="grid grid-cols-1 sm:grid-cols-2">
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
    </>
  );
}

export default System;
