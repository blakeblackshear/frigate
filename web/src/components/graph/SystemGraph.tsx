import { useTheme } from "@/context/theme-provider";
import { FrigateConfig } from "@/types/frigateConfig";
import { Threshold } from "@/types/graph";
import { useCallback, useEffect, useMemo } from "react";
import Chart from "react-apexcharts";
import { isMobileOnly } from "react-device-detect";
import { MdCircle } from "react-icons/md";
import useSWR from "swr";

type ThresholdBarGraphProps = {
  graphId: string;
  name: string;
  unit: string;
  threshold: Threshold;
  updateTimes: number[];
  data: ApexAxisChartSeries;
};
export function ThresholdBarGraph({
  graphId,
  name,
  unit,
  threshold,
  updateTimes,
  data,
}: ThresholdBarGraphProps) {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  const lastValue = useMemo<number>(
    // @ts-expect-error y is valid
    () => data[0].data[data[0].data.length - 1]?.y ?? 0,
    [data],
  );

  const { theme, systemTheme } = useTheme();

  const formatTime = useCallback(
    (val: unknown) => {
      if (val == 1) {
        return;
      }

      const date = new Date(updateTimes[Math.round(val as number) - 1] * 1000);
      return date.toLocaleTimeString([], {
        hour12: config?.ui.time_format != "24hour",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    [config, updateTimes],
  );

  const options = useMemo(() => {
    return {
      chart: {
        id: graphId,
        selection: {
          enabled: false,
        },
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      colors: [
        ({ value }: { value: number }) => {
          if (value >= threshold.error) {
            return "#FA5252";
          } else if (value >= threshold.warning) {
            return "#FF9966";
          } else {
            return "#217930";
          }
        },
      ],
      grid: {
        show: false,
      },
      legend: {
        show: false,
      },
      dataLabels: {
        enabled: false,
      },
      plotOptions: {
        bar: {
          distributed: true,
        },
      },
      states: {
        active: {
          filter: {
            type: "none",
          },
        },
      },
      tooltip: {
        theme: systemTheme || theme,
        y: {
          formatter: (val) => `${val}${unit}`,
        },
      },
      markers: {
        size: 0,
      },
      xaxis: {
        tickAmount: isMobileOnly ? 3 : 4,
        tickPlacement: "on",
        labels: {
          offsetX: -18,
          formatter: formatTime,
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: {
        show: true,
        labels: {
          formatter: (val: number) => Math.ceil(val).toString(),
        },
        min: 0,
      },
    } as ApexCharts.ApexOptions;
  }, [graphId, threshold, unit, systemTheme, theme, formatTime]);

  useEffect(() => {
    ApexCharts.exec(graphId, "updateOptions", options, true, true);
  }, [graphId, options]);

  return (
    <div className="w-full flex flex-col">
      <div className="flex items-center gap-1">
        <div className="text-xs text-muted-foreground">{name}</div>
        <div className="text-xs text-primary">
          {lastValue}
          {unit}
        </div>
      </div>
      <Chart type="bar" options={options} series={data} height="120" />
    </div>
  );
}

const getUnitSize = (MB: number) => {
  if (isNaN(MB) || MB < 0) return "Invalid number";
  if (MB < 1024) return `${MB.toFixed(2)} MiB`;
  if (MB < 1048576) return `${(MB / 1024).toFixed(2)} GiB`;

  return `${(MB / 1048576).toFixed(2)} TiB`;
};

type StorageGraphProps = {
  graphId: string;
  used: number;
  total: number;
};
export function StorageGraph({ graphId, used, total }: StorageGraphProps) {
  const { theme, systemTheme } = useTheme();

  const options = useMemo(() => {
    return {
      chart: {
        id: graphId,
        background: (systemTheme || theme) == "dark" ? "#404040" : "#E5E5E5",
        selection: {
          enabled: false,
        },
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      grid: {
        show: false,
        padding: {
          bottom: -40,
          top: -60,
          left: -20,
          right: 0,
        },
      },
      legend: {
        show: false,
      },
      dataLabels: {
        enabled: false,
      },
      plotOptions: {
        bar: {
          horizontal: true,
        },
      },
      states: {
        active: {
          filter: {
            type: "none",
          },
        },
        hover: {
          filter: {
            type: "none",
          },
        },
      },
      tooltip: {
        enabled: false,
      },
      xaxis: {
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        labels: {
          show: false,
        },
      },
      yaxis: {
        show: false,
        min: 0,
        max: 100,
      },
    } as ApexCharts.ApexOptions;
  }, [graphId, systemTheme, theme]);

  useEffect(() => {
    ApexCharts.exec(graphId, "updateOptions", options, true, true);
  }, [graphId, options]);

  return (
    <div className="w-full flex flex-col gap-2.5">
      <div className="w-full flex justify-between items-center gap-1">
        <div className="flex items-center gap-1">
          <div className="text-xs text-primary">{getUnitSize(used)}</div>
          <div className="text-xs text-primary">/</div>
          <div className="text-xs text-muted-foreground">
            {getUnitSize(total)}
          </div>
        </div>
        <div className="text-xs text-primary">
          {Math.round((used / total) * 100)}%
        </div>
      </div>
      <div className="h-5 rounded-md overflow-hidden">
        <Chart
          type="bar"
          options={options}
          series={[
            { data: [{ x: "storage", y: Math.round((used / total) * 100) }] },
          ]}
          height="100%"
        />
      </div>
    </div>
  );
}

const GRAPH_COLORS = ["#5C7CFA", "#ED5CFA", "#FAD75C"];

type CameraLineGraphProps = {
  graphId: string;
  unit: string;
  dataLabels: string[];
  updateTimes: number[];
  data: ApexAxisChartSeries;
};
export function CameraLineGraph({
  graphId,
  unit,
  dataLabels,
  updateTimes,
  data,
}: CameraLineGraphProps) {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  const lastValues = useMemo<number[] | undefined>(() => {
    if (!dataLabels || !data || data.length == 0) {
      return undefined;
    }

    return dataLabels.map(
      (_, labelIdx) =>
        // @ts-expect-error y is valid
        data[labelIdx].data[data[labelIdx].data.length - 1]?.y ?? 0,
    ) as number[];
  }, [data, dataLabels]);

  const { theme, systemTheme } = useTheme();

  const formatTime = useCallback(
    (val: unknown) => {
      if (val == 1) {
        return;
      }

      const date = new Date(updateTimes[Math.round(val as number)] * 1000);
      return date.toLocaleTimeString([], {
        hour12: config?.ui.time_format != "24hour",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    [config, updateTimes],
  );

  const options = useMemo(() => {
    return {
      chart: {
        id: graphId,
        selection: {
          enabled: false,
        },
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      colors: GRAPH_COLORS,
      grid: {
        show: false,
      },
      legend: {
        show: false,
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        width: 1,
      },
      tooltip: {
        theme: systemTheme || theme,
      },
      markers: {
        size: 0,
      },
      xaxis: {
        tickAmount: isMobileOnly ? 3 : 4,
        tickPlacement: "on",
        labels: {
          offsetX: isMobileOnly ? -18 : 0,
          formatter: formatTime,
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: {
        show: true,
        labels: {
          formatter: (val: number) => Math.ceil(val).toString(),
        },
        min: 0,
      },
    } as ApexCharts.ApexOptions;
  }, [graphId, systemTheme, theme, formatTime]);

  useEffect(() => {
    ApexCharts.exec(graphId, "updateOptions", options, true, true);
  }, [graphId, options]);

  return (
    <div className="w-full flex flex-col">
      {lastValues && (
        <div className="flex items-center gap-2.5">
          {dataLabels.map((label, labelIdx) => (
            <div key={label} className="flex items-center gap-1">
              <MdCircle
                className="size-2"
                style={{ color: GRAPH_COLORS[labelIdx] }}
              />
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-xs text-primary">
                {lastValues[labelIdx]}
                {unit}
              </div>
            </div>
          ))}
        </div>
      )}
      <Chart type="line" options={options} series={data} height="120" />
    </div>
  );
}
