import { useCallback, useMemo, useSyncExternalStore } from "react";
import { Polygon } from "@/types/canvas";
import { subscribeWsTopic, getWsTopicValue } from "@/api/ws";

/**
 * Hook to get enabled state for a polygon from websocket state.
 * Subscribes to all relevant per-polygon topics so it only re-renders
 * when one of those specific topics changes — not on every WS update.
 */
export function usePolygonStates(polygons: Polygon[]) {
  // Build a stable sorted list of topics we need to watch
  const topics = useMemo(() => {
    const set = new Set<string>();
    polygons.forEach((polygon) => {
      const topic =
        polygon.type === "zone"
          ? `${polygon.camera}/zone/${polygon.name}/state`
          : polygon.type === "motion_mask"
            ? `${polygon.camera}/motion_mask/${polygon.name}/state`
            : `${polygon.camera}/object_mask/${polygon.name}/state`;
      set.add(topic);
    });
    return Array.from(set).sort();
  }, [polygons]);

  // Stable key for the topic list so subscribe/getSnapshot stay in sync
  const topicsKey = topics.join("\0");

  // Subscribe to all topics at once — re-subscribe only when the set changes
  const subscribe = useCallback(
    (listener: () => void) => {
      const unsubscribes = topicsKey
        .split("\0")
        .filter(Boolean)
        .map((topic) => subscribeWsTopic(topic, listener));
      return () => unsubscribes.forEach((unsub) => unsub());
    },
    [topicsKey],
  );

  // Build a snapshot string from the current values of all topics.
  // useSyncExternalStore uses Object.is, so we return a primitive that
  // changes only when an observed topic's value changes.
  const getSnapshot = useCallback(() => {
    return topicsKey
      .split("\0")
      .filter(Boolean)
      .map((topic) => `${topic}=${getWsTopicValue(topic) ?? ""}`)
      .join("\0");
  }, [topicsKey]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  // Parse the snapshot into a lookup map
  return useMemo(() => {
    // Build value map from snapshot
    const valueMap = new Map<string, unknown>();
    snapshot.split("\0").forEach((entry) => {
      const eqIdx = entry.indexOf("=");
      if (eqIdx > 0) {
        const topic = entry.slice(0, eqIdx);
        const val = entry.slice(eqIdx + 1) || undefined;
        valueMap.set(topic, val);
      }
    });

    const stateMap = new Map<string, boolean>();
    polygons.forEach((polygon) => {
      const topic =
        polygon.type === "zone"
          ? `${polygon.camera}/zone/${polygon.name}/state`
          : polygon.type === "motion_mask"
            ? `${polygon.camera}/motion_mask/${polygon.name}/state`
            : `${polygon.camera}/object_mask/${polygon.name}/state`;

      const wsValue = valueMap.get(topic);
      const enabled =
        wsValue === "ON"
          ? true
          : wsValue === "OFF"
            ? false
            : (polygon.enabled ?? true);
      stateMap.set(
        `${polygon.camera}/${polygon.type}/${polygon.name}`,
        enabled,
      );
    });

    return (polygon: Polygon) => {
      return (
        stateMap.get(`${polygon.camera}/${polygon.type}/${polygon.name}`) ??
        true
      );
    };
  }, [polygons, snapshot]);
}
