type PtzFeature =
  | "pt"
  | "zoom"
  | "pt-r"
  | "zoom-r"
  | "zoom-a"
  | "pt-r-fov"
  | "focus";

export type CameraPtzInfo = {
  name: string;
  features: PtzFeature[];
  presets: string[];
};
