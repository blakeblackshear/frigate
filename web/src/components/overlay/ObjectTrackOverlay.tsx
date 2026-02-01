import { useMemo, useCallback } from "react";
import { TrackingDetailsSequence, LifecycleClassType } from "@/types/timeline";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import { useDetailStream } from "@/context/detail-stream-context";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Event } from "@/types/event";
import { resolveZoneName } from "@/hooks/use-zone-friendly-name";

// Use a small tolerance (10ms) for browsers with seek precision by-design issues
const TOLERANCE = 0.01;

type ObjectTrackOverlayProps = {
  camera: string;
  showBoundingBoxes?: boolean;
  currentTime: number;
  videoWidth: number;
  videoHeight: number;
  className?: string;
  onSeekToTime?: (timestamp: number, play?: boolean) => void;
};

type PathPoint = {
  x: number;
  y: number;
  timestamp: number;
  lifecycle_item?: TrackingDetailsSequence;
  objectId: string;
};

type ObjectData = {
  objectId: string;
  label: string;
  color: string;
  pathPoints: PathPoint[];
  currentZones: string[];
  currentBox?: number[];
  currentAttributeBox?: number[];
};

export default function ObjectTrackOverlay({
  camera,
  showBoundingBoxes = false,
  currentTime,
  videoWidth,
  videoHeight,
  className,
  onSeekToTime,
}: ObjectTrackOverlayProps) {
  const { t } = useTranslation("views/events");
  const { data: config } = useSWR<FrigateConfig>("config");
  const { annotationOffset, selectedObjectIds } = useDetailStream();

  const effectiveCurrentTime = currentTime - annotationOffset / 1000;

  const {
    pathStroke,
    pointRadius,
    pointStroke,
    zoneStroke,
    boxStroke,
    highlightRadius,
  } = useMemo(() => {
    const BASE_WIDTH = 1280;
    const BASE_HEIGHT = 720;
    const BASE_PATH_STROKE = 5;
    const BASE_POINT_RADIUS = 7;
    const BASE_POINT_STROKE = 3;
    const BASE_ZONE_STROKE = 5;
    const BASE_BOX_STROKE = 5;
    const BASE_HIGHLIGHT_RADIUS = 5;

    const scale = Math.sqrt(
      (videoWidth * videoHeight) / (BASE_WIDTH * BASE_HEIGHT),
    );

    const pathStroke = Math.max(1, Math.round(BASE_PATH_STROKE * scale));
    const pointRadius = Math.max(2, Math.round(BASE_POINT_RADIUS * scale));
    const pointStroke = Math.max(1, Math.round(BASE_POINT_STROKE * scale));
    const zoneStroke = Math.max(1, Math.round(BASE_ZONE_STROKE * scale));
    const boxStroke = Math.max(1, Math.round(BASE_BOX_STROKE * scale));
    const highlightRadius = Math.max(
      2,
      Math.round(BASE_HIGHLIGHT_RADIUS * scale),
    );

    return {
      pathStroke,
      pointRadius,
      pointStroke,
      zoneStroke,
      boxStroke,
      highlightRadius,
    };
  }, [videoWidth, videoHeight]);

  // Fetch all event data in a single request (CSV ids)
  const { data: eventsData } = useSWR<Event[]>(
    selectedObjectIds.length > 0
      ? ["event_ids", { ids: selectedObjectIds.join(",") }]
      : null,
    null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
    },
  );

  // Fetch timeline data for each object ID using fixed number of hooks
  const { data: timelineData } = useSWR<TrackingDetailsSequence[]>(
    selectedObjectIds.length > 0
      ? `timeline?source_id=${selectedObjectIds.join(",")}&limit=1000`
      : null,
    null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
    },
  );

  const getZonesFriendlyNames = (zones: string[], config: FrigateConfig) => {
    return zones?.map((zone) => resolveZoneName(config, zone)) ?? [];
  };

  const timelineResults = useMemo(() => {
    // Group timeline entries by source_id
    if (!timelineData) return selectedObjectIds.map(() => []);

    const grouped: Record<string, TrackingDetailsSequence[]> = {};
    for (const entry of timelineData) {
      if (!grouped[entry.source_id]) {
        grouped[entry.source_id] = [];
      }
      grouped[entry.source_id].push(entry);
    }

    // Return timeline arrays in the same order as selectedObjectIds
    return selectedObjectIds.map((id) => {
      const entries = grouped[id] || [];
      return entries.map((event) => ({
        ...event,
        data: {
          ...event.data,
          zones_friendly_names: config
            ? getZonesFriendlyNames(event.data?.zones, config)
            : [],
        },
      }));
    });
  }, [selectedObjectIds, timelineData, config]);

  const typeColorMap = useMemo(
    () => ({
      [LifecycleClassType.VISIBLE]: [0, 255, 0], // Green
      [LifecycleClassType.GONE]: [255, 0, 0], // Red
      [LifecycleClassType.ENTERED_ZONE]: [255, 165, 0], // Orange
      [LifecycleClassType.ATTRIBUTE]: [128, 0, 128], // Purple
      [LifecycleClassType.ACTIVE]: [255, 255, 0], // Yellow
      [LifecycleClassType.STATIONARY]: [128, 128, 128], // Gray
      [LifecycleClassType.HEARD]: [0, 255, 255], // Cyan
      [LifecycleClassType.EXTERNAL]: [165, 42, 42], // Brown
    }),
    [],
  );

  const getObjectColor = useCallback(
    (label: string, objectId: string) => {
      const objectColor = config?.model?.colormap[label];
      if (objectColor) {
        const reversed = [...objectColor].reverse();
        return `rgb(${reversed.join(",")})`;
      }
      // Fallback to deterministic color based on object ID
      return generateColorFromId(objectId);
    },
    [config],
  );

  const getZoneColor = useCallback(
    (zoneName: string) => {
      const zoneColor = config?.cameras?.[camera]?.zones?.[zoneName]?.color;
      if (zoneColor) {
        const reversed = [...zoneColor].reverse();
        return `rgb(${reversed.join(",")})`;
      }
      return "rgb(255, 0, 0)"; // fallback red
    },
    [config, camera],
  );

  // Build per-object data structures
  const objectsData = useMemo<ObjectData[]>(() => {
    if (!eventsData || !Array.isArray(eventsData)) return [];
    if (config?.cameras[camera]?.onvif.autotracking.enabled_in_config)
      return [];

    return selectedObjectIds
      .map((objectId, index) => {
        const eventData = eventsData.find((e) => e.id === objectId);
        const timelineData = timelineResults[index];

        // get saved path points from event
        const savedPathPoints: PathPoint[] =
          eventData?.data?.path_data?.map(
            ([coords, timestamp]: [number[], number]) => ({
              x: coords[0],
              y: coords[1],
              timestamp,
              lifecycle_item: undefined,
              objectId,
            }),
          ) || [];

        // timeline points for this object
        const eventSequencePoints: PathPoint[] =
          timelineData
            ?.filter(
              (event: TrackingDetailsSequence) => event.data.box !== undefined,
            )
            .map((event: TrackingDetailsSequence) => {
              const [left, top, width, height] = event.data.box!;
              return {
                x: left + width / 2, // Center x
                y: top + height, // Bottom y
                timestamp: event.timestamp,
                lifecycle_item: event,
                objectId,
              };
            }) || [];

        // show full path once current time has reached the object's start time
        // event.start_time is in DETECT stream time, so convert it to record stream time for comparison
        const eventStartTimeRecord =
          (eventData?.start_time ?? 0) + annotationOffset / 1000;

        const allPoints = [...savedPathPoints, ...eventSequencePoints].sort(
          (a, b) => a.timestamp - b.timestamp,
        );
        const combinedPoints = allPoints.filter(
          (point) =>
            currentTime >= eventStartTimeRecord - TOLERANCE &&
            point.timestamp <= effectiveCurrentTime + TOLERANCE,
        );

        // Get color for this object
        const label = eventData?.label || "unknown";
        const color = getObjectColor(label, objectId);

        // zones (with tolerance for browsers with seek precision by-design issues)
        const currentZones =
          timelineData
            ?.filter(
              (event: TrackingDetailsSequence) =>
                event.timestamp <= effectiveCurrentTime + TOLERANCE,
            )
            .sort(
              (a: TrackingDetailsSequence, b: TrackingDetailsSequence) =>
                b.timestamp - a.timestamp,
            )[0]?.data?.zones || [];

        // bounding box - only show if there's a timeline event at/near the current time with a box
        // Search all timeline events (not just those before current time) to find one matching the seek position
        const nearbyTimelineEvent = timelineData
          ?.filter((event: TrackingDetailsSequence) => event.data.box)
          .sort(
            (a: TrackingDetailsSequence, b: TrackingDetailsSequence) =>
              Math.abs(a.timestamp - effectiveCurrentTime) -
              Math.abs(b.timestamp - effectiveCurrentTime),
          )
          .find(
            (event: TrackingDetailsSequence) =>
              Math.abs(event.timestamp - effectiveCurrentTime) <= TOLERANCE,
          );

        const currentBox = nearbyTimelineEvent?.data?.box;
        const currentAttributeBox = nearbyTimelineEvent?.data?.attribute_box;

        return {
          objectId,
          label,
          color,
          pathPoints: combinedPoints,
          currentZones,
          currentBox,
          currentAttributeBox,
        };
      })
      .filter((obj: ObjectData) => obj.pathPoints.length > 0); // Only include objects with path data
  }, [
    eventsData,
    selectedObjectIds,
    timelineResults,
    currentTime,
    effectiveCurrentTime,
    getObjectColor,
    config,
    camera,
    annotationOffset,
  ]);

  // Collect all zones across all objects
  const allZones = useMemo(() => {
    if (!config?.cameras?.[camera]?.zones) return [];

    const zoneNames = new Set<string>();
    objectsData.forEach((obj) => {
      obj.currentZones.forEach((zone) => zoneNames.add(zone));
    });

    return Object.entries(config.cameras[camera].zones)
      .filter(([name]) => zoneNames.has(name))
      .map(([name, zone]) => ({
        name,
        coordinates: zone.coordinates,
        color: getZoneColor(name),
      }));
  }, [config, camera, objectsData, getZoneColor]);

  const generateStraightPath = useCallback(
    (points: { x: number; y: number }[]) => {
      if (!points || points.length < 2) return "";
      let path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`;
      }
      return path;
    },
    [],
  );

  const getPointColor = useCallback(
    (baseColorString: string, type?: string) => {
      if (type && typeColorMap[type as keyof typeof typeColorMap]) {
        const typeColor = typeColorMap[type as keyof typeof typeColorMap];
        if (typeColor) {
          return `rgb(${typeColor.join(",")})`;
        }
      }
      // Parse and darken base color slightly for path points
      const match = baseColorString.match(/\d+/g);
      if (match) {
        const [r, g, b] = match.map(Number);
        return `rgb(${Math.max(0, r - 10)}, ${Math.max(0, g - 10)}, ${Math.max(0, b - 10)})`;
      }
      return baseColorString;
    },
    [typeColorMap],
  );

  const handlePointClick = useCallback(
    (timestamp: number) => {
      // Convert detect stream timestamp to record stream timestamp before seeking
      onSeekToTime?.(timestamp + annotationOffset / 1000, false);
    },
    [onSeekToTime, annotationOffset],
  );

  const zonePolygons = useMemo(() => {
    return allZones.map((zone) => {
      // Convert zone coordinates from normalized (0-1) to pixel coordinates
      const points = zone.coordinates
        .split(",")
        .map(Number.parseFloat)
        .reduce((acc: string[], value, index) => {
          const isXCoordinate = index % 2 === 0;
          const coordinate = isXCoordinate
            ? value * videoWidth
            : value * videoHeight;
          acc.push(coordinate.toString());
          return acc;
        }, [])
        .join(",");

      return {
        key: zone.name,
        points,
        fill: `rgba(${zone.color.replace("rgb(", "").replace(")", "")}, 0.3)`,
        stroke: zone.color,
      };
    });
  }, [allZones, videoWidth, videoHeight]);

  if (objectsData.length === 0 || !config) {
    return null;
  }

  return (
    <svg
      className={cn(className)}
      viewBox={`0 0 ${videoWidth} ${videoHeight}`}
      style={{
        width: "100%",
        height: "100%",
      }}
      preserveAspectRatio="xMidYMid slice"
    >
      {zonePolygons.map((zone) => (
        <polygon
          key={zone.key}
          points={zone.points}
          fill={zone.fill}
          stroke={zone.stroke}
          strokeWidth={zoneStroke}
          opacity="0.7"
        />
      ))}

      {objectsData.map((objData) => {
        const absolutePositions = objData.pathPoints.map((point) => ({
          x: point.x * videoWidth,
          y: point.y * videoHeight,
          timestamp: point.timestamp,
          lifecycle_item: point.lifecycle_item,
        }));

        return (
          <g key={objData.objectId}>
            {absolutePositions.length > 1 && (
              <path
                d={generateStraightPath(absolutePositions)}
                fill="none"
                stroke={objData.color}
                strokeWidth={pathStroke}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {absolutePositions.map((pos, index) => (
              <Tooltip key={`${objData.objectId}-point-${index}`}>
                <TooltipTrigger asChild>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={pointRadius}
                    fill={getPointColor(
                      objData.color,
                      pos.lifecycle_item?.class_type,
                    )}
                    stroke="white"
                    strokeWidth={pointStroke}
                    style={{ cursor: onSeekToTime ? "pointer" : "default" }}
                    onClick={() => handlePointClick(pos.timestamp)}
                  />
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent side="top" className="smart-capitalize">
                    {pos.lifecycle_item
                      ? `${pos.lifecycle_item.class_type.replace("_", " ")} at ${new Date(pos.timestamp * 1000).toLocaleTimeString()}`
                      : t("objectTrack.trackedPoint")}
                    {onSeekToTime && (
                      <div className="mt-1 text-xs normal-case text-muted-foreground">
                        {t("objectTrack.clickToSeek")}
                      </div>
                    )}
                  </TooltipContent>
                </TooltipPortal>
              </Tooltip>
            ))}

            {objData.currentBox && showBoundingBoxes && (
              <g>
                <rect
                  x={objData.currentBox[0] * videoWidth}
                  y={objData.currentBox[1] * videoHeight}
                  width={objData.currentBox[2] * videoWidth}
                  height={objData.currentBox[3] * videoHeight}
                  fill="none"
                  stroke={objData.color}
                  strokeWidth={boxStroke}
                  opacity="0.9"
                />
                <circle
                  cx={
                    (objData.currentBox[0] + objData.currentBox[2] / 2) *
                    videoWidth
                  }
                  cy={
                    (objData.currentBox[1] + objData.currentBox[3]) *
                    videoHeight
                  }
                  r={highlightRadius}
                  fill="rgb(255, 255, 0)" // yellow highlight
                  stroke={objData.color}
                  strokeWidth={boxStroke}
                  opacity="1"
                />
              </g>
            )}
            {objData.currentAttributeBox && showBoundingBoxes && (
              <g>
                <rect
                  x={objData.currentAttributeBox[0] * videoWidth}
                  y={objData.currentAttributeBox[1] * videoHeight}
                  width={objData.currentAttributeBox[2] * videoWidth}
                  height={objData.currentAttributeBox[3] * videoHeight}
                  fill="none"
                  stroke={objData.color}
                  strokeWidth={boxStroke}
                  opacity="0.9"
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Generate a deterministic HSL color from a string (object ID)
function generateColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Use golden ratio to distribute hues evenly
  const hue = (hash * 137.508) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}
