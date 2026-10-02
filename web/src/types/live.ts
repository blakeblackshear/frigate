export type LivePlayerMode = "webrtc" | "mse" | "jsmpeg" | "debug";
export type VideoResolutionType = {
  width: number;
  height: number;
};

type LiveProducerMetadata = {
  type: string;
  url: string;
  remote_addr: string;
  user_agent: string;
  sdp: string;
  medias?: string[];
  receivers?: string[];
  recv: number;
};

type LiveConsumerMetadata = {
  type: string;
  url: string;
  remote_addr: string;
  user_agent: string;
  sdp: string;
  medias?: string[];
  senders?: string[];
  send: number;
};

export type LiveStreamMetadata = {
  producers: LiveProducerMetadata[];
  consumers: LiveConsumerMetadata[];
};

// mse-codec is go2rtc's proof that it has no codec this browser plays;
// mse-decode also covers transient Safari failures
export type LivePlayerError =
  "stalled" | "startup" | "mse-decode" | "mse-codec";

// one second of delivery from the playing transport
export type LiveHealthSample = {
  bytes: number;
  mediaSeconds: number;
  wallSeconds: number;
};

// why auto is playing below the top stream
export type LiveAutoReason = "bandwidth" | "codec" | "saveData" | "floor";

export type TwoWayTalkError = "microphone" | "refused";

export type WebRTCUnavailableReason =
  | "browser"
  | "not-configured"
  | "unreachable"
  | "video-codec"
  | "audio-codec"
  | "checking";

export type AudioState = Record<string, boolean>;
export type StatsState = Record<string, boolean>;
export type VolumeState = Record<string, number>;

export type PlayerStatsType = {
  streamType: string;
  bandwidth: number;
  totalFrames: number;
  droppedFrames: number | undefined;
  decodedFrames: number | undefined;
  droppedFrameRate: number | undefined;
};
