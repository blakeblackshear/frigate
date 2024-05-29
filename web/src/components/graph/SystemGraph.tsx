import { useTheme } from "@/context/theme-provider";
import { FrigateConfig } from "@/types/frigateConfig";
import { Threshold } from "@/types/graph";
import { useCallback, useEffect, useMemo } from "react";
import Chart from "react-apexcharts";
import { isMobileOnly } from "react-device-detect";
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
      const dateIndex = Math.round(val as number);

      let timeOffset = 0;
      if (dateIndex < 0) {
        timeOffset = 5000 * Math.abs(dateIndex);
      }

      const date = new Date(
        updateTimes[Math.max(1, dateIndex) - 1] * 1000 - timeOffset,
      );
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
          rotate: 0,
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

  const chartData = useMemo(() => {
    if (data.length > 0 && data[0].data.length >= 30) {
      return data;
    }

    const copiedData = [...data];
    const fakeData = [];
    for (let i = data.length; i < 30; i++) {
      fakeData.push({ x: i - 30, y: 0 });
    }

    // @ts-expect-error data types are not obvious
    copiedData[0].data = [...fakeData, ...data[0].data];
    return copiedData;
  }, [data]);

  return (
    <div className="flex w-full flex-col">
      <div className="flex items-center gap-1">
        <div className="text-xs text-muted-foreground">{name}</div>
        <div className="text-xs text-primary">
          {lastValue}
          {unit}
        </div>
      </div>
      <Chart type="bar" options={options} series={chartData} height="120" />
    </div>
  );
}
