import Chart from "react-apexcharts";

type SystemGraphProps = {
  graphId: string;
  title: string;
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
      type="line"
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
          onItemClick: {
            toggleDataSeries: true,
          },
        },
        title: {
          text: title,
        },
        xaxis: {
          type: "datetime",
        },
        yaxis: {
          tickAmount: 3,
          labels: {
            formatter: (value) => {
              return `${value.toFixed(2)} ${unit}`;
            },
          },
        },
      }}
      series={data}
      height="100%"
    />
  );
}
