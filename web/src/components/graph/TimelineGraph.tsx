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
        chart: {
          id: id,
          toolbar: {
            show: false,
          },
        },
        dataLabels: { enabled: false },
        grid: {
          show: false,
        },
        xaxis: {
          type: "datetime",
          labels: {
            show: false,
          },
        },
        yaxis: {
          labels: {
            show: false,
          },
        },
      }}
      series={data}
      height={100}
    />
  );
}
