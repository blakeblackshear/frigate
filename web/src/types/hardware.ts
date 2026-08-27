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

export type HwaccelFamily = {
  key: string;
  // keyed by codec, or a single "any" preset when it decodes every codec
  presets: Record<string, string>;
};

export type HwaccelRecommendation = {
  recommended: string;
  available: HwaccelFamily[];
};
