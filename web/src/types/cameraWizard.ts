// Camera Wizard Types
export const CAMERA_BRANDS = [
  {
    value: "dahua" as const,
    label: "Dahua / Amcrest / EmpireTech",
    template:
      "rtsp://{username}:{password}@{host}:554/cam/realmonitor?channel=1&subtype=0",
    exampleUrl:
      "rtsp://admin:password@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0",
    dynamicTemplates: undefined,
  },
  {
    value: "hikvision" as const,
    label: "Hikvision / Uniview / Annke",
    template: "rtsp://{username}:{password}@{host}:554/Streaming/Channels/101",
    exampleUrl:
      "rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101",
    dynamicTemplates: undefined,
  },
  {
    value: "ubiquiti" as const,
    label: "Ubiquiti",
    template: "rtsp://{username}:{password}@{host}:554/live/ch0",
    exampleUrl: "rtsp://ubnt:password@192.168.1.100:554/live/ch0",
    dynamicTemplates: undefined,
  },
  {
    value: "reolink" as const,
    label: "Reolink",
    template: "dynamic",
    dynamicTemplates: {
      "http-flv":
        "http://{host}/flv?port=1935&app=bcs&stream=channel0_main.bcs&user={username}&password={password}",
      rtsp: "rtsp://{username}:{password}@{host}:554/Preview_01_main",
    },
    exampleUrl:
      "http://192.168.1.100/flv?port=1935&app=bcs&stream=channel0_main.bcs&user=admin&password=password or rtsp://admin:password@192.168.1.100:554/Preview_01_main",
  },
  {
    value: "axis" as const,
    label: "Axis",
    template: "rtsp://{username}:{password}@{host}:554/axis-media/media.amp",
    exampleUrl: "rtsp://root:password@192.168.1.100:554/axis-media/media.amp",
    dynamicTemplates: undefined,
  },
  {
    value: "tplink" as const,
    label: "TP-Link",
    template: "rtsp://{username}:{password}@{host}:554/stream1",
    exampleUrl: "rtsp://admin:password@192.168.1.100:554/stream1",
    dynamicTemplates: undefined,
  },
  {
    value: "foscam" as const,
    label: "Foscam",
    template: "rtsp://{username}:{password}@{host}:88/videoMain",
    exampleUrl: "rtsp://admin:password@192.168.1.100:88/videoMain",
    dynamicTemplates: undefined,
  },
  {
    value: "other" as const,
    label: "Other",
    template: "",
    exampleUrl: "rtsp://username:password@host:port/path",
    dynamicTemplates: undefined,
  },
] as const;

export const CAMERA_BRAND_VALUES = CAMERA_BRANDS.map(
  (brand) => brand.value,
) as unknown as [
  (typeof CAMERA_BRANDS)[number]["value"],
  ...(typeof CAMERA_BRANDS)[number]["value"][],
];

export type CameraBrand = (typeof CAMERA_BRANDS)[number]["value"];

export type StreamRole = "detect" | "record" | "audio";

export type StreamConfig = {
  id: string;
  url: string;
  roles: StreamRole[];
  resolution?: string;
  quality?: string;
  testResult?: TestResult;
  userTested?: boolean;
  useFfmpeg?: boolean;
  restream?: boolean;
};

export type TestResult = {
  success: boolean;
  snapshot?: string; // base64 image
  resolution?: string;
  videoCodec?: string;
  audioCodec?: string;
  fps?: number;
  error?: string;
};

export type CandidateTestMap = Record<
  string,
  TestResult | { success: false; error: string }
>;

export type WizardFormData = {
  cameraName?: string;
  host?: string;
  username?: string;
  password?: string;
  brandTemplate?: CameraBrand;
  customUrl?: string;
  streams?: StreamConfig[];
  probeMode?: boolean; // true for probe, false for manual
  onvifPort?: number;
  useDigestAuth?: boolean;
  probeResult?: OnvifProbeResponse;
  probeCandidates?: string[]; // candidate URLs from probe
  candidateTests?: CandidateTestMap; // test results for candidates
  hasBackchannel?: boolean; // true if camera supports backchannel audio
};

// API Response Types
export type FfprobeResponse = {
  return_code: number;
  stderr: string | string[];
  stdout: FfprobeData | string;
};

export type FfprobeData = {
  streams: FfprobeStream[];
};

export type FfprobeStream = {
  index?: number;
  codec_name?: string;
  codec_long_name?: string;
  codec_type?: "video" | "audio";
  profile?: string;
  width?: number;
  height?: number;
  pix_fmt?: string;
  level?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
};

// Config API Types
export type CameraConfigData = {
  cameras: {
    [cameraName: string]: {
      enabled: boolean;
      friendly_name?: string;
      ffmpeg: {
        inputs: {
          path: string;
          roles: string[];
          input_args?: string;
        }[];
      };
      live?: {
        streams: Record<string, string>;
      };
    };
  };
  go2rtc?: {
    streams: {
      [streamName: string]: string[];
    };
  };
};

export type ConfigSetBody = {
  requires_restart: number;
  config_data: CameraConfigData;
  update_topic?: string;
};

export type OnvifRtspCandidate = {
  source: "GetStreamUri" | "pattern";
  profile_token?: string;
  uri: string;
};

export type OnvifProbeResponse = {
  success: boolean;
  host?: string;
  port?: number;
  manufacturer?: string;
  model?: string;
  firmware_version?: string;
  profiles_count?: number;
  ptz_supported?: boolean;
  presets_count?: number;
  autotrack_supported?: boolean;
  move_status_supported?: boolean;
  rtsp_candidates?: OnvifRtspCandidate[];
  message?: string;
  detail?: string;
};
