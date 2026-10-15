type PtzFeature =
  | "pt"
  | "zoom"
  | "pt-r"
  | "zoom-r"
  | "zoom-a"
  | "pt-r-fov"
  | "focus"
  | "home"
  | "home-set";

export type OnvifProfile = {
  name: string;
  token: string;
};

export type PtzPreset = {
  token: string;
  name: string;
};

export type CameraPtzInfo = {
  name: string;
  features: PtzFeature[];
  presets: string[];
  preset_details?: PtzPreset[];
  max_presets?: number | null;
  profiles: OnvifProfile[];
};
