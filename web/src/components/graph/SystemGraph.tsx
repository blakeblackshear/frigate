import Chart from "react-apexcharts";

type SystemGraphProps = {
  graphId: string;
  title?: string;
  unit: string;
  data: ApexAxisChartSeries;
};
export default function SystemGraph({
  graphId,
  title,
  unit,
  data,
}: SystemGraphProps) {
  return (
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
        legend: {
          show: true,
          showForSingleSeries: true,
          position: "top",
          horizontalAlign: "left",
          onItemClick: {
            toggleDataSeries: true,
          },
        },
        dataLabels: {
          enabled: false,
        },
        xaxis: {
          type: "datetime",
        },
        yaxis: {
          show: false,
        },
      }}
      series={data}
      height="120"
    />
  );
}
