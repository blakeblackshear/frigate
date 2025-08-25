import { useEffect, useMemo, useState, useCallback } from "react";
import { MdCircle } from "react-icons/md";
import Chart from "react-apexcharts";
import { useTheme } from "@/context/theme-provider";
import { useWs } from "@/api/ws";
import { useDateLocale } from "@/hooks/use-date-locale";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useTranslation } from "react-i18next";

const GRAPH_COLORS = ["#3b82f6", "#ef4444"]; // RMS, dBFS

interface AudioLevelGraphProps {
  cameraName: string;
}

export function AudioLevelGraph({ cameraName }: AudioLevelGraphProps) {
  const [audioData, setAudioData] = useState<
    { timestamp: number; rms: number; dBFS: number }[]
  >([]);
  const [maxDataPoints] = useState(50);

  // config for time formatting
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const locale = useDateLocale();
  const { t } = useTranslation(["common"]);

  const {
    value: { payload: audioRms },
  } = useWs(`${cameraName}/audio/rms`, "");
  const {
    value: { payload: audioDBFS },
  } = useWs(`${cameraName}/audio/dBFS`, "");

  useEffect(() => {
    if (typeof audioRms === "number") {
      const now = Date.now();
      setAudioData((prev) => {
        const next = [
          ...prev,
          {
            timestamp: now,
            rms: audioRms,
            dBFS: typeof audioDBFS === "number" ? audioDBFS : 0,
          },
        ];
        return next.slice(-maxDataPoints);
      });
    }
  }, [audioRms, audioDBFS, maxDataPoints]);

  const series = useMemo(
    () => [
      {
        name: "RMS",
        data: audioData.map((p) => ({ x: p.timestamp, y: p.rms })),
      },
      {
        name: "dBFS",
        data: audioData.map((p) => ({ x: p.timestamp, y: p.dBFS })),
      },
    ],
    [audioData],
  );

  const lastValues = useMemo(() => {
    if (!audioData.length) return undefined;
    const last = audioData[audioData.length - 1];
    return [last.rms, last.dBFS];
  }, [audioData]);

  const timeFormat = config?.ui.time_format === "24hour" ? "24hour" : "12hour";
  const formatString = useMemo(
    () =>
      t(`time.formattedTimestampHourMinuteSecond.${timeFormat}`, {
        ns: "common",
      }),
    [t, timeFormat],
  );

  const formatTime = useCallback(
    (val: unknown) => {
      const seconds = Math.round(Number(val) / 1000);
      return formatUnixTimestampToDateTime(seconds, {
        timezone: config?.ui.timezone,
        date_format: formatString,
        locale,
      });
    },
    [config?.ui.timezone, formatString, locale],
  );

  const { theme, systemTheme } = useTheme();

  const options = useMemo(() => {
    return {
      chart: {
        id: `${cameraName}-audio`,
        selection: { enabled: false },
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: { enabled: false },
      },
      colors: GRAPH_COLORS,
      grid: {
        show: true,
        borderColor: "#374151",
        strokeDashArray: 3,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: true } },
      },
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: { width: 1 },
      markers: { size: 0 },
      tooltip: {
        theme: systemTheme || theme,
        x: { formatter: (val: number) => formatTime(val) },
        y: { formatter: (v: number) => v.toFixed(1) },
      },
      xaxis: {
        type: "datetime",
        labels: {
          rotate: 0,
          formatter: formatTime,
          style: { colors: "#6B6B6B", fontSize: "10px" },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        show: true,
        labels: {
          formatter: (val: number) => Math.round(val).toString(),
          style: { colors: "#6B6B6B", fontSize: "10px" },
        },
      },
    } as ApexCharts.ApexOptions;
  }, [cameraName, theme, systemTheme, formatTime]);

  return (
    <div className="my-4 flex flex-col">
      {lastValues && (
        <div className="mb-2 flex flex-wrap items-center gap-2.5">
          {["RMS", "dBFS"].map((label, idx) => (
            <div key={label} className="flex items-center gap-1">
              <MdCircle
                className="size-2"
                style={{ color: GRAPH_COLORS[idx] }}
              />
              <div className="text-xs text-secondary-foreground">{label}</div>
              <div className="text-xs text-primary">
                {lastValues[idx].toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      )}
      <Chart type="line" options={options} series={series} />
    </div>
  );
}
