import { GraphData } from "@/types/graph";
import Chart from "react-apexcharts";

type TimelineGraphProps = {
  id: string;
  data: GraphData[];
};

/**
 * A graph meant to be overlaid on top of a timeline
 */
export default function TimelineGraph({ id, data }: TimelineGraphProps) {
  return (
    <Chart
      type="bar"
      options={{
        colors: ["#991b1b", "#06b6d4", "#ea580c"],
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
        },
        legend: {
          show: false,
          position: "top",
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
        },
        yaxis: {
          labels: {
            show: false,
          },
          logarithmic: true,
          logBase: 10,
        },
      }}
      series={data}
      height="100%"
    />
  );
}
