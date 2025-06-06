import { useTheme } from "@/context/theme-provider";
import { useDateLocale } from "@/hooks/use-date-locale";
import { FrigateConfig } from "@/types/frigateConfig";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { useCallback, useEffect, useMemo } from "react";
import Chart from "react-apexcharts";
import { isMobileOnly } from "react-device-detect";
import { useTranslation } from "react-i18next";
import { MdCircle } from "react-icons/md";
import useSWR from "swr";

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
  const { t } = useTranslation(["views/system", "common"]);
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

  const locale = useDateLocale();

  const timeFormat = config?.ui.time_format === "24hour" ? "24hour" : "12hour";
  const format = useMemo(() => {
    return t(`time.formattedTimestampHourMinute.${timeFormat}`, {
      ns: "common",
    });
  }, [t, timeFormat]);

  const formatTime = useCallback(
    (val: unknown) => {
      return formatUnixTimestampToDateTime(
        updateTimes[Math.round(val as number)],
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
      },
    } as ApexCharts.ApexOptions;
  }, [graphId, systemTheme, theme, formatTime]);

  useEffect(() => {
    ApexCharts.exec(graphId, "updateOptions", options, true, true);
  }, [graphId, options]);

  return (
    <div className="flex w-full flex-col">
      {lastValues && (
        <div className="flex flex-wrap items-center gap-2.5">
          {dataLabels.map((label, labelIdx) => (
            <div key={label} className="flex items-center gap-1">
              <MdCircle
                className="size-2"
                style={{ color: GRAPH_COLORS[labelIdx] }}
              />
              <div className="text-xs text-secondary-foreground">
                {t("cameras.label." + label)}
              </div>
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

type EventsPerSecondLineGraphProps = {
  graphId: string;
  unit: string;
  name: string;
  updateTimes: number[];
  data: ApexAxisChartSeries;
};
export function EventsPerSecondsLineGraph({
  graphId,
  unit,
  name,
  updateTimes,
  data,
}: EventsPerSecondLineGraphProps) {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  const { theme, systemTheme } = useTheme();

  const lastValue = useMemo<number>(
    // @ts-expect-error y is valid
    () => data[0].data[data[0].data.length - 1]?.y ?? 0,
    [data],
  );

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
      return formatUnixTimestampToDateTime(
        updateTimes[Math.round(val as number) - 1],
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
      },
    } as ApexCharts.ApexOptions;
  }, [graphId, systemTheme, theme, formatTime]);

  useEffect(() => {
    ApexCharts.exec(graphId, "updateOptions", options, true, true);
  }, [graphId, options]);

  return (
    <div className="flex w-full flex-col">
      <div className="flex items-center gap-1">
        <div className="text-xs text-secondary-foreground">{name}</div>
        <div className="text-xs text-primary">
          {lastValue}
          {unit}
        </div>
      </div>
      <Chart type="line" options={options} series={data} height="120" />
    </div>
  );
}
