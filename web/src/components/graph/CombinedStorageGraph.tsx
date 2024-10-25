import { useTheme } from "@/context/theme-provider";
import { generateColors } from "@/utils/colorUtil";
import { useEffect, useMemo } from "react";
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
import { LuAlertCircle } from "react-icons/lu";

type CameraStorage = {
  [key: string]: {
    bandwidth: number;
    usage: number;
    usage_percent: number;
  };
};

type TotalStorage = {
  used: number;
  total: number;
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
  const { theme, systemTheme } = useTheme();

  const entities = Object.keys(cameraStorage);
  const colors = generateColors(entities.length);

  const series = entities.map((entity, index) => ({
    name: entity,
    data: [(cameraStorage[entity].usage / totalStorage.total) * 100],
    usage: cameraStorage[entity].usage,
    bandwidth: cameraStorage[entity].bandwidth,
    color: colors[index], // Assign the corresponding color
  }));

  // Add the unused percentage to the series
  series.push({
    name: "Unused",
    data: [
      ((totalStorage.total - totalStorage.used) / totalStorage.total) * 100,
    ],
    usage: totalStorage.total - totalStorage.used,
    bandwidth: 0,
    color: (systemTheme || theme) == "dark" ? "#404040" : "#E5E5E5",
  });

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

  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex w-full items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <div className="text-xs text-primary">
            {getUnitSize(totalStorage.used)}
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
              <TableHead>Camera</TableHead>
              <TableHead>Storage Used</TableHead>
              <TableHead>Percentage of Total Used</TableHead>
              <TableHead>Bandwidth</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {series.map((item) => (
              <TableRow key={item.name}>
                <TableCell className="flex flex-row items-center gap-2 font-medium capitalize">
                  {" "}
                  <div
                    className="size-3 rounded-md"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  {item.name.replaceAll("_", " ")}
                  {item.name === "Unused" && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="focus:outline-none"
                          aria-label="Unused Storage Information"
                        >
                          <LuAlertCircle
                            className="size-5"
                            aria-label="Unused Storage Information"
                          />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-2">
                          This value may not accurately represent the free space
                          available to Frigate if you have other files stored on
                          your drive beyond Frigate's recordings. Frigate does
                          not track storage usage outside of its recordings.
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </TableCell>
                <TableCell>{getUnitSize(item.usage ?? 0)}</TableCell>
                <TableCell>{item.data[0].toFixed(2)}%</TableCell>
                <TableCell>
                  {item.name === "Unused"
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
