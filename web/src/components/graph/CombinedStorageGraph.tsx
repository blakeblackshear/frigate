import { useTheme } from "@/context/theme-provider";
import { generateColors } from "@/utils/colorUtil";
import { useCallback, useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
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

import { CiCircleAlert } from "react-icons/ci";
import { useTranslation } from "react-i18next";

type CameraStorage = {
  [key: string]: {
    bandwidth: number;
    usage: number;
    usage_percent: number;
  };
};

type TotalStorage = {
  used: number;
  camera: number;
  total: number;
};

type CombinedStorageGraphProps = {
  graphId: string;
  cameraStorage: CameraStorage;
  totalStorage: TotalStorage;
};

type StorageSeries = {
  name: string;
  data: number[];
  usage: number;
  bandwidth: number;
  color: string;
};

type SortKey = "camera" | "usage" | "bandwidth";
type SortDirection = "asc" | "desc";

const defaultSortDirections: Record<SortKey, SortDirection> = {
  camera: "asc",
  usage: "desc",
  bandwidth: "desc",
};

export function CombinedStorageGraph({
  graphId,
  cameraStorage,
  totalStorage,
}: CombinedStorageGraphProps) {
  const { t } = useTranslation(["views/system"]);

  const { theme, systemTheme } = useTheme();
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "camera",
    direction: defaultSortDirections.camera,
  });

  const entities = useMemo(() => Object.keys(cameraStorage), [cameraStorage]);

  const handleSort = useCallback((key: SortKey) => {
    setSortConfig((currentSort) => {
      if (currentSort.key == key) {
        return {
          key,
          direction: currentSort.direction == "asc" ? "desc" : "asc",
        };
      }

      return { key, direction: defaultSortDirections[key] };
    });
  }, []);

  const getAriaSort = useCallback(
    (key: SortKey) => {
      if (sortConfig.key != key) {
        return "none";
      }

      return sortConfig.direction == "asc" ? "ascending" : "descending";
    },
    [sortConfig],
  );

  const getSortIcon = useCallback(
    (key: SortKey) => {
      if (sortConfig.key != key) {
        return <ChevronsUpDown className="size-3.5 opacity-50" />;
      }

      return sortConfig.direction == "asc" ? (
        <ArrowUp className="size-3.5" />
      ) : (
        <ArrowDown className="size-3.5" />
      );
    },
    [sortConfig],
  );

  const series = useMemo<StorageSeries[]>(() => {
    const colors = generateColors(entities.length);

    const cameraSeries = entities.map((entity, index) => ({
      name: entity,
      data: [(cameraStorage[entity].usage / totalStorage.total) * 100],
      usage: cameraStorage[entity].usage,
      bandwidth: cameraStorage[entity].bandwidth,
      color: colors[index],
    }));

    cameraSeries.sort((left, right) => {
      let comparison = 0;

      if (sortConfig.key == "camera") {
        comparison = left.name
          .replaceAll("_", " ")
          .localeCompare(right.name.replaceAll("_", " "), undefined, {
            numeric: true,
            sensitivity: "base",
          });
      } else {
        comparison = left[sortConfig.key] - right[sortConfig.key];
      }

      return sortConfig.direction == "asc" ? comparison : -comparison;
    });

    return [
      ...cameraSeries,
      {
        name: "Other",
        data: [
          ((totalStorage.used - totalStorage.camera) / totalStorage.total) *
            100,
        ],
        usage: totalStorage.used - totalStorage.camera,
        bandwidth: 0,
        color: (systemTheme || theme) == "dark" ? "#606060" : "#D5D5D5",
      },
      {
        name: "Unused",
        data: [
          ((totalStorage.total - totalStorage.used) / totalStorage.total) * 100,
        ],
        usage: totalStorage.total - totalStorage.used,
        bandwidth: 0,
        color: (systemTheme || theme) == "dark" ? "#404040" : "#E5E5E5",
      },
    ];
  }, [cameraStorage, entities, sortConfig, systemTheme, theme, totalStorage]);

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
  }, [graphId, systemTheme, theme, series]);

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

  const getSortHeader = useCallback(
    (key: SortKey, label: string, ariaLabel: string) => (
      <button
        type="button"
        className="flex items-center gap-1 text-left hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-selected"
        aria-label={ariaLabel}
        onClick={() => handleSort(key)}
      >
        <span>{label}</span>
        {getSortIcon(key)}
      </button>
    ),
    [getSortIcon, handleSort],
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
              <TableHead aria-sort={getAriaSort("camera")}>
                {getSortHeader(
                  "camera",
                  t("storage.cameraStorage.camera"),
                  t("storage.cameraStorage.sort.camera"),
                )}
              </TableHead>
              <TableHead aria-sort={getAriaSort("usage")}>
                {getSortHeader(
                  "usage",
                  t("storage.cameraStorage.storageUsed"),
                  t("storage.cameraStorage.sort.storage"),
                )}
              </TableHead>
              <TableHead>
                {t("storage.cameraStorage.percentageOfTotalUsed")}
              </TableHead>
              <TableHead aria-sort={getAriaSort("bandwidth")}>
                {getSortHeader(
                  "bandwidth",
                  t("storage.cameraStorage.bandwidth"),
                  t("storage.cameraStorage.sort.bandwidth"),
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {series.map((item) => (
              <TableRow key={item.name}>
                <TableCell className="flex flex-row items-center gap-2 font-medium smart-capitalize">
                  {" "}
                  <div
                    className="size-3 rounded-md"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  {getItemTitle(item.name)}
                  {(item.name === "Unused" || item.name == "Other") && (
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
                <TableCell>{getUnitSize(item.usage ?? 0)}</TableCell>
                <TableCell>{item.data[0].toFixed(2)}%</TableCell>
                <TableCell>
                  {item.name === "Unused" || item.name == "Other"
                    ? "—"
                    : `${getUnitSize(item.bandwidth)} / hour`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
