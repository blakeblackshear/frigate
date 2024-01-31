import { GraphData } from "@/types/graph";
import Chart from "react-apexcharts";

type TimelineGraphProps = {
  id: string;
  data: GraphData[];
  start: number;
  end: number;
  objects: number[];
};

/**
 * A graph meant to be overlaid on top of a timeline
 */
export default function TimelineGraph({
  id,
  data,
  start,
  end,
  objects,
}: TimelineGraphProps) {
  return (
    <Chart
      type="bar"
      options={{
        colors: [
          ({ dataPointIndex }: { dataPointIndex: number }) => {
            if (objects.includes(dataPointIndex)) {
              return "#06b6d4";
            } else {
              return "#991b1b";
            }
          },
        ],
        chart: {
          id: id,
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
        dataLabels: { enabled: false },
        grid: {
          show: false,
          padding: {
            bottom: 2,
            top: -12,
            left: -20,
            right: 0,
          },
        },
        legend: {
          show: false,
          position: "top",
        },
        plotOptions: {
          bar: {
            columnWidth: "100%",
            barHeight: "100%",
            hideZeroBarsWhenGrouped: true,
          },
        },
        stroke: {
          width: 0,
        },
        tooltip: {
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
            show: false,
          },
          min: start,
          max: end,
        },
        yaxis: {
          axisBorder: {
            show: false,
          },
          labels: {
            show: false,
          },
        },
      }}
      series={data}
      height="100%"
    />
  );
}
