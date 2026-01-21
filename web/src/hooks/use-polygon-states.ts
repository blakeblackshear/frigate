import { useMemo } from "react";
import { Polygon } from "@/types/canvas";
import { useWsState } from "@/api/ws";

/**
 * Hook to get enabled state for a polygon from websocket state.
 * Memoizes the lookup function to avoid unnecessary re-renders.
 */
export function usePolygonStates(polygons: Polygon[]) {
  const wsState = useWsState();

  // Create a memoized lookup map that only updates when relevant ws values change
  return useMemo(() => {
    const stateMap = new Map<string, boolean>();

    polygons.forEach((polygon) => {
      const topic =
        polygon.type === "zone"
          ? `${polygon.camera}/zone/${polygon.name}/state`
          : polygon.type === "motion_mask"
            ? `${polygon.camera}/motion_mask/${polygon.name}/state`
            : `${polygon.camera}/object_mask/${polygon.name}/state`;

      const wsValue = wsState[topic];
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
  }, [polygons, wsState]);
}
