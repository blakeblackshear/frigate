type PtzFeature =
  | "pt"
  | "zoom"
  | "pt-r"
  | "zoom-r"
  | "zoom-a"
  | "pt-r-fov"
  | "focus";

export type OnvifProfile = {
  name: string;
  token: string;
};

export type CameraPtzInfo = {
  name: string;
  features: PtzFeature[];
  presets: string[];
  profiles: OnvifProfile[];
};
