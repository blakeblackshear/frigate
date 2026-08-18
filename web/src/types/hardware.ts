export type HardwareUnit = {
  device: string;
  label: string;
};

export type DetectionHardware = {
  key: string;
  detector: string;
  name: string;
  units: HardwareUnit[];
  count: number;
  unlimited: boolean;
};

export type HwaccelRecommendation = {
  preset: string;
};
