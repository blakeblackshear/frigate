/**
 * Debug replay status factory.
 *
 * The Replay page polls /api/debug_replay/status every 1s via SWR.
 * The no-session state shows an empty state; the active state
 * renders the live camera image + debug toggles + objects/messages
 * tabs. Used by replay.spec.ts.
 */

export type DebugReplayStatus = {
  active: boolean;
  replay_camera: string | null;
  source_camera: string | null;
  start_time: number | null;
  end_time: number | null;
  live_ready: boolean;
};

export function noSessionStatus(): DebugReplayStatus {
  return {
    active: false,
    replay_camera: null,
    source_camera: null,
    start_time: null,
    end_time: null,
    live_ready: false,
  };
}

export function activeSessionStatus(
  opts: {
    camera?: string;
    sourceCamera?: string;
    startTime?: number;
    endTime?: number;
    liveReady?: boolean;
  } = {},
): DebugReplayStatus {
  const {
    camera = "front_door",
    sourceCamera = "front_door",
    startTime = Date.now() / 1000 - 3600,
    endTime = Date.now() / 1000 - 1800,
    liveReady = true,
  } = opts;
  return {
    active: true,
    replay_camera: camera,
    source_camera: sourceCamera,
    start_time: startTime,
    end_time: endTime,
    live_ready: liveReady,
  };
}
