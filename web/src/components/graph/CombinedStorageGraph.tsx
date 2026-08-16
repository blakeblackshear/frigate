import { useTheme } from "@/context/theme-provider";
import { generateColors } from "@/utils/colorUtil";
import { useCallback, useEffect, useMemo } from "react";
import Chart from "react-apexcharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getUnitSize } from "@/utils/storageUtil";
import { CameraStorage, StreamStorage } from "@/types/stats";

import { CiCircleAlert } from "react-icons/ci";
import { useTranslation } from "react-i18next";

type TotalStorage = {
  used: number;
  camera: number;
  total: number;
};

type StorageRow = {
  name: string;
  usage: number;
  bandwidth: number;
  color: string;
  streams?: {
    main?: StreamStorage;
    sub?: StreamStorage;
  };
};

type CombinedStorageGraphProps = {
  graphId: string;
  cameraStorage: CameraStorage;
  totalStorage: TotalStorage;
};
export function CombinedStorageGraph({
  graphId,
  cameraStorage,
  totalStorage,
}: CombinedStorageGraphProps) {
  const { t } = useTranslation(["views/system", "components/player"]);

  const { theme, systemTheme } = useTheme();
  const isDark = (systemTheme || theme) == "dark";

  const rows: StorageRow[] = useMemo(() => {
    const entities = Object.keys(cameraStorage);
    const colors = generateColors(entities.length);

    return [
      ...entities.map((entity, index) => ({
        name: entity,
        usage: cameraStorage[entity].usage ?? 0,
        bandwidth: cameraStorage[entity].bandwidth,
        color: colors[index],
        streams: cameraStorage[entity].streams,
      })),
      {
        name: "Other",
        usage: totalStorage.used - totalStorage.camera,
        bandwidth: 0,
        color: isDark ? "#606060" : "#D5D5D5",
      },
      {
        name: "Unused",
        usage: totalStorage.total - totalStorage.used,
        bandwidth: 0,
        color: isDark ? "#404040" : "#E5E5E5",
      },
    ];
  }, [cameraStorage, totalStorage, isDark]);

  const series = useMemo(
    () =>
      rows.map((row) => ({
        name: row.name,
        data: [(row.usage / totalStorage.total) * 100],
        usage: row.usage,
        color: row.color,
      })),
    [rows, totalStorage.total],
  );

  const hasSubStorage = useMemo(
    () => rows.some((row) => row.streams?.sub),
    [rows],
  );

  const options = useMemo(() => {
    return {
      chart: {
        id: graphId,
        background: isDark ? "#404040" : "#E5E5E5",
        selection: {
          enabled: false,
        },
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
        stacked: true,
        stackType: "100%",
      },
      grid: {
        show: false,
        padding: {
          bottom: -45,
          top: -40,
          left: -20,
          right: -20,
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
        x: {
          show: false,
        },
        y: {
          formatter: function (val, { seriesIndex }) {
            if (series[seriesIndex]) {
              const usage = series[seriesIndex].usage;
              return `${getUnitSize(usage)} (${val.toFixed(2)}%)`;
            }
          },
        },
        theme: systemTheme || theme,
      },
      xaxis: {
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        labels: {
          formatter: function (val) {
            return val + "%";
          },
        },
        min: 0,
        max: 100,
      },
      yaxis: {
        show: false,
        min: 0,
        max: 100,
      },
    } as ApexCharts.ApexOptions;
  }, [graphId, isDark, systemTheme, theme, series]);

  useEffect(() => {
    ApexCharts.exec(graphId, "updateOptions", options, true, true);
  }, [graphId, options]);

  // convenience

  const getItemTitle = useCallback(
    (name: string) => {
      if (name == "Unused") {
        return t("storage.cameraStorage.unused.title");
      } else if (name == "Other") {
        return t("label.other", { ns: "common" });
      } else {
        return name.replaceAll("_", " ");
      }
    },
    [t],
  );

  const getStreamSplit = useCallback(
    (row: StorageRow, field: keyof StreamStorage) => {
      const sub = row.streams?.sub;

      if (!sub) {
        return null;
      }

      return (
        <div className="text-xs text-primary-variant">
          <div>
            <span className="text-muted-foreground">
              {t("quality.main", { ns: "components/player" })}
            </span>{" "}
            {getUnitSize(row.streams?.main?.[field] ?? 0)}
          </div>
          <div>
            <span className="text-muted-foreground">
              {t("quality.sub", { ns: "components/player" })}
            </span>{" "}
            {getUnitSize(sub[field])}
          </div>
        </div>
      );
    },
    [t],
  );

  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex w-full items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <div className="text-xs text-primary">
            {getUnitSize(totalStorage.camera)}
          </div>
          <div className="text-xs text-primary">/</div>
          <div className="text-xs text-muted-foreground">
            {getUnitSize(totalStorage.total)}
          </div>
        </div>
      </div>
      <div className="h-5 overflow-hidden rounded-md">
        <Chart type="bar" options={options} series={series} height="100%" />
      </div>
      <div className="custom-legend">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("storage.cameraStorage.camera")}</TableHead>
              <TableHead>
                <div className="flex flex-row items-center gap-1">
                  {t("storage.cameraStorage.storageUsed")}
                  {hasSubStorage && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="focus:outline-none"
                          aria-label={t(
                            "storage.cameraStorage.subStream.information",
                          )}
                        >
                          <CiCircleAlert
                            className="size-5"
                            aria-label={t(
                              "storage.cameraStorage.subStream.information",
                            )}
                          />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-2">
                          {t("storage.cameraStorage.subStream.tips")}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </TableHead>
              <TableHead>
                {t("storage.cameraStorage.percentageOfTotalUsed")}
              </TableHead>
              <TableHead>{t("storage.cameraStorage.bandwidth")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isAggregate = row.name == "Unused" || row.name == "Other";

              return (
                <TableRow key={row.name}>
                  <TableCell className="flex flex-row items-center gap-2 font-medium smart-capitalize">
                    <div
                      className="size-3 rounded-md"
                      style={{ backgroundColor: row.color }}
                    ></div>
                    {getItemTitle(row.name)}
                    {isAggregate && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className="focus:outline-none"
                            aria-label={t(
                              "storage.cameraStorage.unusedStorageInformation",
                            )}
                          >
                            <CiCircleAlert
                              className="size-5"
                              aria-label={t(
                                "storage.cameraStorage.unusedStorageInformation",
                              )}
                            />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            {t("storage.cameraStorage.unused.tips")}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </TableCell>
                  <TableCell>
                    {getUnitSize(row.usage)}
                    {getStreamSplit(row, "usage")}
                  </TableCell>
                  <TableCell>
                    {((row.usage / totalStorage.total) * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    {isAggregate ? "—" : `${getUnitSize(row.bandwidth)} / hour`}
                    {getStreamSplit(row, "bandwidth")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
