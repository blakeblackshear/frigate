export type GraphDataPoint = {
  x: Date;
  y: number;
};

export type GraphData = {
  name?: string;
  data: GraphDataPoint[];
};
