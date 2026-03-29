import { useTheme } from "@/context/theme-provider";
import { useDateLocale } from "@/hooks/use-date-locale";
import { FrigateConfig } from "@/types/frigateConfig";
import { Threshold } from "@/types/graph";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { useCallback, useEffect, useMemo, useRef } from "react";
import Chart from "react-apexcharts";
import { isMobileOnly } from "react-device-detect";
import { useTranslation } from "react-i18next";
import useSWR from "swr";

type ThresholdBarGraphProps = {
  graphId: string;
  name?: string;
  unit: string;
  threshold: Threshold;
  updateTimes: number[];
  data: ApexAxisChartSeries;
  isActive?: boolean;
};
export function ThresholdBarGraph({
  graphId,
  name,
  unit,
  threshold,
  updateTimes,
  data,
  isActive = true,
}: ThresholdBarGraphProps) {
  const displayName = name || data[0]?.name || "";
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  const lastValue = useMemo<number>(
    // @ts-expect-error y is valid
    () => data[0].data[data[0].data.length - 1]?.y ?? 0,
    [data],
  );

  const yMax = useMemo(() => {
    if (unit != "%") {
      return undefined;
    }

    // @ts-expect-error y is valid
    const yValues: number[] = data[0].data.map((point) => point?.y);
    return Math.max(threshold.warning, ...yValues);
  }, [data, threshold, unit]);

  const { theme, systemTheme } = useTheme();

  const locale = useDateLocale();
  const { t } = useTranslation(["common"]);

  const timeFormat = config?.ui.time_format === "24hour" ? "24hour" : "12hour";
  const format = useMemo(() => {
    return t(`time.formattedTimestampHourMinute.${timeFormat}`, {
      ns: "common",
    });
  }, [t, timeFormat]);

  const formatTime = useCallback(
    (val: unknown) => {
      const dateIndex = Math.round(val as number);

      let timeOffset = 0;
      if (dateIndex < 0) {
        timeOffset = 5 * Math.abs(dateIndex);
      }
      return formatUnixTimestampToDateTime(
        updateTimes[Math.max(1, dateIndex) - 1] - timeOffset,
        {
          timezone: config?.ui.timezone,
          date_format: format,
          locale,
        },
      );
    },
    [config?.ui.timezone, format, locale, updateTimes],
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
        tickAmount: isMobileOnly ? 2 : 3,
        tickPlacement: "on",
        labels: {
          rotate: 0,
          formatter: formatTime,
          style: {
            colors: "#6B6B6B",
          },
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
          style: {
            colors: "#6B6B6B",
          },
        },
        min: 0,
        max: yMax,
      },
    } as ApexCharts.ApexOptions;
  }, [graphId, threshold, unit, yMax, systemTheme, theme, formatTime]);

  useEffect(() => {
    ApexCharts.exec(graphId, "updateOptions", options, true, true);
  }, [graphId, options]);

  const chartData = useMemo(() => {
    if (data.length > 0 && data[0].data.length >= 30) {
      return data;
    }

    const dataPointCount = data[0].data.length;
    const fakeData = [];
    for (let i = dataPointCount; i < 30; i++) {
      fakeData.push({ x: i - 30, y: 0 });
    }

    const paddedFirst = {
      ...data[0],
      data: [...fakeData, ...data[0].data],
    };
    return [paddedFirst, ...data.slice(1)] as ApexAxisChartSeries;
  }, [data]);

  const hasBeenActive = useRef(isActive);
  useEffect(() => {
    if (isActive && hasBeenActive.current === false) {
      ApexCharts.exec(graphId, "updateSeries", chartData, true);
    }
    hasBeenActive.current = isActive;
    // only replay animation on visibility change, not data updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, graphId]);

  return (
    <div className="flex w-full flex-col">
      <div className="flex items-center gap-1">
        <div className="text-xs text-secondary-foreground">{displayName}</div>
        <div className="text-xs text-primary">
          {lastValue}
          {unit}
        </div>
      </div>
      <Chart type="bar" options={options} series={chartData} height="120" />
    </div>
  );
}
