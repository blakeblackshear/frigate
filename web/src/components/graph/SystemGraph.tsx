import { Threshold } from "@/types/graph";
import { useMemo } from "react";
import Chart from "react-apexcharts";

type SystemGraphProps = {
  graphId: string;
  name: string;
  unit: string;
  threshold: Threshold;
  data: ApexAxisChartSeries;
};
export default function SystemGraph({
  graphId,
  name,
  unit,
  threshold,
  data,
}: SystemGraphProps) {
  const lastValue = useMemo<number>(
    // @ts-expect-error y is valid
    () => data[0].data[data[0].data.length - 1]?.y ?? 0,
    [data],
  );

  return (
    <div className="w-full flex flex-col">
      <div className="flex items-center gap-1">
        <div className="text-xs text-muted-foreground">{name}</div>
        <div className="text-xs text-primary-foreground">
          {lastValue}
          {unit}
        </div>
      </div>
      <Chart
        type="bar"
        options={{
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
                return "#aa00aa";
              } else {
                return "#404040";
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
          xaxis: {
            type: "datetime",
            axisBorder: {
              show: false,
            },
            axisTicks: {
              show: false,
            },
            labels: {
              format: "h:mm",
              datetimeUTC: false,
            },
          },
          yaxis: {
            show: false,
            max: lastValue * 2,
          },
        }}
        series={data}
        height="120"
      />
    </div>
  );
}
