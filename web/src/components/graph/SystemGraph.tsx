import { useTheme } from "@/context/theme-provider";
import { Threshold } from "@/types/graph";
import { useCallback, useEffect, useMemo } from "react";
import Chart from "react-apexcharts";

type SystemGraphProps = {
  graphId: string;
  name: string;
  unit: string;
  threshold: Threshold;
  updateTimes: number[];
  data: ApexAxisChartSeries;
};
export default function SystemGraph({
  graphId,
  name,
  unit,
  threshold,
  updateTimes,
  data,
}: SystemGraphProps) {
  const lastValue = useMemo<number>(
    // @ts-expect-error y is valid
    () => data[0].data[data[0].data.length - 1]?.y ?? 0,
    [data],
  );

  const { theme, systemTheme } = useTheme();

  const formatTime = useCallback(
    (val: unknown) => {
      const date = new Date(updateTimes[Math.round(val as number)] * 1000);
      return `${date.getHours() > 12 ? date.getHours() - 12 : date.getHours()}:${date.getMinutes()}`;
    },
    [updateTimes],
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
            return (systemTheme || theme) == "dark" ? "#404040" : "#E5E5E5";
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
      tooltip: {
        theme: systemTheme || theme,
      },
      xaxis: {
        tickAmount: 6,
        labels: {
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
        show: false,
        max: lastValue * 2,
      },
    };
  }, [graphId, lastValue, threshold, systemTheme, theme, formatTime]);

  useEffect(() => {
    ApexCharts.exec(graphId, "updateOptions", options, true, true);
  }, [graphId, options]);

  return (
    <div className="w-full flex flex-col">
      <div className="flex items-center gap-1">
        <div className="text-xs text-muted-foreground">{name}</div>
        <div className="text-xs text-primary-foreground">
          {lastValue}
          {unit}
        </div>
      </div>
      <Chart type="bar" options={options} series={data} height="120" />
    </div>
  );
}
