import Heading from "@/components/ui/heading";
import useSWR from "swr";
import { FrigateStats } from "@/types/stats";
import { useMemo } from "react";
import SystemGraph from "@/components/graph/SystemGraph";

function System() {
  // stats
  const { data: statsHistory } = useSWR<FrigateStats[]>("stats/history", {
    revalidateOnFocus: false,
  });

  // stats data pieces
  const inferenceTimeSeries = useMemo(() => {
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
  const cpuMemSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: any; y: any }[] };
    } = {};

    statsHistory.forEach((stats) => {
      const statTime = new Date(stats.service.last_updated * 1000);

      Object.entries(stats.detectors).forEach(([key, detectorStats]) => {
        const cpuKey = `${key}-cpu`;
        const memKey = `${key}-mem`;

        if (!(cpuKey in series)) {
          series[cpuKey] = { name: `${key} Cpu`, data: [] };
        }

        if (!(memKey in series)) {
          series[memKey] = { name: `${key} Memory`, data: [] };
        }

        const detUsages = stats.cpu_usages[detectorStats.pid.toString()];

        series[cpuKey].data.push({ x: statTime, y: detUsages.cpu });
        series[memKey].data.push({ x: statTime, y: detUsages.mem });
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
      <Heading as="h2">System</Heading>

      <Heading as="h4">Detectors</Heading>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <SystemGraph
          graphId="detector-inference"
          title="Inference Speed"
          unit="ms"
          data={inferenceTimeSeries}
        />
        <SystemGraph
          graphId="detector-usages"
          title="CPU / Memory"
          unit="%"
          data={cpuMemSeries}
        />
      </div>
      {gpuSeries.length > 0 && (
        <>
          <Heading as="h4">GPUs</Heading>
          <div className="grid grid-cols-1 md:grid-cols-2">
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
      <div className="grid grid-cols-1 md:grid-cols-2">
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
