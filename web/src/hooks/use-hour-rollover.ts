import { useEffect, useRef } from "react";

// the mp4 lands some way past :00 (first frame after the boundary, then an
// encode), and background tabs clamp timers to ~1min, so ladder rather than
// fire once.
const RETRY_OFFSETS = [15, 45, 120, 300]; // seconds past the hour

/** Runs `callback` several times past each hour boundary; must be idempotent. */
export function useHourRollover(callback: () => void, enabled: boolean = true) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let timeouts: ReturnType<typeof setTimeout>[] = [];

    const scheduleNextHour = () => {
      // every prior timeout has fired by the time this reschedules itself
      timeouts = [];

      const now = Date.now();
      const nextHour = new Date(now);
      nextHour.setUTCMinutes(0, 0, 0);
      nextHour.setUTCHours(nextHour.getUTCHours() + 1);
      const msUntilBoundary = nextHour.getTime() - now;

      RETRY_OFFSETS.forEach((offset) => {
        timeouts.push(
          setTimeout(
            () => callbackRef.current(),
            msUntilBoundary + offset * 1000,
          ),
        );
      });

      // repeat the ladder next hour
      timeouts.push(
        setTimeout(
          scheduleNextHour,
          msUntilBoundary +
            (RETRY_OFFSETS[RETRY_OFFSETS.length - 1] + 1) * 1000,
        ),
      );
    };

    scheduleNextHour();

    return () => timeouts.forEach(clearTimeout);
  }, [enabled]);
}
