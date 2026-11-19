export type DebugReplayStatus = {
  active: boolean;
  replay_camera: string | null;
  source_camera: string | null;
  start_time: number | null;
  end_time: number | null;
  live_ready: boolean;
};
