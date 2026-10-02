import { LiveStreamGovernor } from "@/components/player/LiveStreamGovernor";
import { isCameraOffline } from "@/hooks/use-camera-activity";
import { useAutoFrigateStats } from "@/hooks/use-stats";
import {
  LiveAutoReason,
  LiveHealthSample,
  LivePlayerError,
} from "@/types/live";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

// one governor per camera ladder for the tab session, so reopening a
// camera resumes where auto settled
const governors = new Map<string, LiveStreamGovernor>();

function governorFor(cameraName: string, streams: string[]) {
  const key = `${cameraName}|${streams.join(",")}`;
  let governor = governors.get(key);
  if (!governor) {
    // the extra rung is the jsmpeg floor
    governor = new LiveStreamGovernor(streams.length + 1);
    governors.set(key, governor);
  }
  return governor;
}

type UseAutoLiveStreamProps = {
  cameraName: string;
  // go2rtc stream names in config order
  streams: string[];
  // auto is the stream setting
  selected: boolean;
  // mic, debug, force low-bandwidth, the error fallback latch, or unloaded
  // preferences own the player
  paused: boolean;
};

export type AutoLiveStream = {
  streamName: string | undefined;
  atFloor: boolean;
  reason: LiveAutoReason | undefined;
  onHealthSample: (sample: LiveHealthSample) => void;
  handleError: (error: LivePlayerError) => boolean;
  reset: () => void;
};

export function useAutoLiveStream({
  cameraName,
  streams,
  selected,
  paused,
}: UseAutoLiveStreamProps): AutoLiveStream {
  const governor = useMemo(
    () => governorFor(cameraName, streams),
    [cameraName, streams],
  );
  const { rung, reason } = useSyncExternalStore(
    governor.subscribe,
    governor.getSnapshot,
  );
  const active = selected && !paused;

  const stats = useAutoFrigateStats();
  const offline = isCameraOffline(stats, cameraName);

  // evidence from before a pin, a pause, or a remount does not count
  useEffect(() => {
    if (active) {
      governor.resetHistory();
    }
  }, [active, governor]);

  useEffect(() => {
    if (!selected) {
      return;
    }

    const saveData =
      (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData === true;
    governor.setHoldLow(saveData);
  }, [selected, governor]);

  useEffect(() => {
    if (!active) {
      return;
    }

    // a hidden tab delivers no samples, so its time is not clean time
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        governor.tick();
      } else {
        governor.resetHistory();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [active, governor]);

  const onHealthSample = useCallback(
    (sample: LiveHealthSample) => {
      if (active) {
        governor.sample(sample);
      }
    },
    [active, governor],
  );

  const handleError = useCallback(
    (error: LivePlayerError) => active && governor.playerError(error, !offline),
    [active, governor, offline],
  );

  const reset = useCallback(() => governor.reset(), [governor]);

  const floor = streams.length;

  return {
    streamName: selected ? streams[Math.min(rung, floor - 1)] : undefined,
    atFloor: selected && rung === floor,
    reason: selected ? reason : undefined,
    onHealthSample,
    handleError,
    reset,
  };
}
