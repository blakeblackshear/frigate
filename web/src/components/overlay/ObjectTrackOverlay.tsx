import { useMemo, useCallback } from "react";
import { ObjectLifecycleSequence, LifecycleClassType } from "@/types/timeline";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import { useActivityStream } from "@/contexts/ActivityStreamContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type ObjectTrackOverlayProps = {
  camera: string;
  selectedObjectId: string;
  currentTime: number;
  videoWidth: number;
  videoHeight: number;
  className?: string;
  onSeekToTime?: (timestamp: number) => void;
  objectTimeline?: ObjectLifecycleSequence[];
};

export default function ObjectTrackOverlay({
  camera,
  selectedObjectId,
  currentTime,
  videoWidth,
  videoHeight,
  className,
  onSeekToTime,
  objectTimeline,
}: ObjectTrackOverlayProps) {
  const { t } = useTranslation("views/events");
  const { data: config } = useSWR<FrigateConfig>("config");
  const { annotationOffset } = useActivityStream();

  const effectiveCurrentTime = currentTime - annotationOffset / 1000;

  // Fetch the full event data to get saved path points
  const { data: eventData } = useSWR(["event_ids", { ids: selectedObjectId }]);

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

  const getObjectColor = useMemo(() => {
    return (label: string) => {
      const objectColor = config?.model?.colormap[label];
      if (objectColor) {
        const reversed = [...objectColor].reverse();
        return `rgb(${reversed.join(",")})`;
      }
      return "rgb(255, 0, 0)"; // fallback red
    };
  }, [config]);

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

  const currentObjectZones = useMemo(() => {
    if (!objectTimeline) return [];

    // Find the most recent timeline event at or before effective current time
    const relevantEvents = objectTimeline
      .filter((event) => event.timestamp <= effectiveCurrentTime)
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first

    // Get zones from the most recent event
    return relevantEvents[0]?.data?.zones || [];
  }, [objectTimeline, effectiveCurrentTime]);

  const zones = useMemo(() => {
    if (!config?.cameras?.[camera]?.zones || !currentObjectZones.length)
      return [];

    return Object.entries(config.cameras[camera].zones)
      .filter(([name]) => currentObjectZones.includes(name))
      .map(([name, zone]) => ({
        name,
        coordinates: zone.coordinates,
        color: getZoneColor(name),
      }));
  }, [config, camera, getZoneColor, currentObjectZones]);

  // get saved path points from event
  const savedPathPoints = useMemo(() => {
    return (
      eventData?.[0].data?.path_data?.map(
        ([coords, timestamp]: [number[], number]) => ({
          x: coords[0],
          y: coords[1],
          timestamp,
          lifecycle_item: undefined,
        }),
      ) || []
    );
  }, [eventData]);

  // timeline points for selected event
  const eventSequencePoints = useMemo(() => {
    return (
      objectTimeline
        ?.filter((event) => event.data.box !== undefined)
        .map((event) => {
          const [left, top, width, height] = event.data.box!;

          return {
            x: left + width / 2, // Center x
            y: top + height, // Bottom y
            timestamp: event.timestamp,
            lifecycle_item: event,
          };
        }) || []
    );
  }, [objectTimeline]);

  // final object path with timeline points included
  const pathPoints = useMemo(() => {
    // don't display a path for autotracking cameras
    if (config?.cameras[camera]?.onvif.autotracking.enabled_in_config)
      return [];

    const combinedPoints = [...savedPathPoints, ...eventSequencePoints].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    // Filter points around current time (within a reasonable window)
    const timeWindow = 30; // 30 seconds window
    return combinedPoints.filter(
      (point) =>
        point.timestamp >= currentTime - timeWindow &&
        point.timestamp <= currentTime + timeWindow,
    );
  }, [savedPathPoints, eventSequencePoints, config, camera, currentTime]);

  // get absolute positions on the svg canvas for each point
  const absolutePositions = useMemo(() => {
    if (!pathPoints) return [];

    return pathPoints.map((point) => {
      // Find the corresponding timeline entry for this point
      const timelineEntry = objectTimeline?.find(
        (entry) => entry.timestamp == point.timestamp,
      );
      return {
        x: point.x * videoWidth,
        y: point.y * videoHeight,
        timestamp: point.timestamp,
        lifecycle_item:
          timelineEntry ||
          (point.box // normal path point
            ? {
                timestamp: point.timestamp,
                camera: camera,
                source: "tracked_object",
                source_id: selectedObjectId,
                class_type: "visible" as LifecycleClassType,
                data: {
                  camera: camera,
                  label: point.label,
                  sub_label: "",
                  box: point.box,
                  region: [0, 0, 0, 0], // placeholder
                  attribute: "",
                  zones: [],
                },
              }
            : undefined),
      };
    });
  }, [
    pathPoints,
    videoWidth,
    videoHeight,
    objectTimeline,
    camera,
    selectedObjectId,
  ]);

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
    (baseColor: number[], type?: string) => {
      if (type && typeColorMap[type as keyof typeof typeColorMap]) {
        const typeColor = typeColorMap[type as keyof typeof typeColorMap];
        if (typeColor) {
          return `rgb(${typeColor.join(",")})`;
        }
      }
      // normal path point
      return `rgb(${baseColor.map((c) => Math.max(0, c - 10)).join(",")})`;
    },
    [typeColorMap],
  );

  const handlePointClick = useCallback(
    (timestamp: number) => {
      onSeekToTime?.(timestamp);
    },
    [onSeekToTime],
  );

  // render bounding box for object at current time if we have a timeline entry
  const currentBoundingBox = useMemo(() => {
    if (!objectTimeline) return null;

    // Find the most recent timeline event at or before effective current time with a bounding box
    const relevantEvents = objectTimeline
      .filter(
        (event) => event.timestamp <= effectiveCurrentTime && event.data.box,
      )
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first

    const currentEvent = relevantEvents[0];

    if (!currentEvent?.data.box) return null;

    const [left, top, width, height] = currentEvent.data.box;
    return {
      left,
      top,
      width,
      height,
      centerX: left + width / 2,
      centerY: top + height,
    };
  }, [objectTimeline, effectiveCurrentTime]);

  const objectColor = useMemo(() => {
    return pathPoints[0]?.label
      ? getObjectColor(pathPoints[0].label)
      : "rgb(255, 0, 0)";
  }, [pathPoints, getObjectColor]);

  const objectColorArray = useMemo(() => {
    return pathPoints[0]?.label
      ? getObjectColor(pathPoints[0].label).match(/\d+/g)?.map(Number) || [
          255, 0, 0,
        ]
      : [255, 0, 0];
  }, [pathPoints, getObjectColor]);

  // render any zones for object at current time
  const zonePolygons = useMemo(() => {
    return zones.map((zone) => {
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
  }, [zones, videoWidth, videoHeight]);

  if (!pathPoints.length || !config) {
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
          strokeWidth="5"
          opacity="0.7"
        />
      ))}

      {absolutePositions.length > 1 && (
        <path
          d={generateStraightPath(absolutePositions)}
          fill="none"
          stroke={objectColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {absolutePositions.map((pos, index) => (
        <Tooltip key={`point-${index}`}>
          <TooltipTrigger asChild>
            <circle
              cx={pos.x}
              cy={pos.y}
              r="7"
              fill={getPointColor(
                objectColorArray,
                pos.lifecycle_item?.class_type,
              )}
              stroke="white"
              strokeWidth="3"
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
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("objectTrack.clickToSeek")}
                </div>
              )}
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      ))}

      {currentBoundingBox && (
        <g>
          <rect
            x={currentBoundingBox.left * videoWidth}
            y={currentBoundingBox.top * videoHeight}
            width={currentBoundingBox.width * videoWidth}
            height={currentBoundingBox.height * videoHeight}
            fill="none"
            stroke={objectColor}
            strokeWidth="5"
            opacity="0.9"
          />

          <circle
            cx={currentBoundingBox.centerX * videoWidth}
            cy={currentBoundingBox.centerY * videoHeight}
            r="5"
            fill="rgb(255, 255, 0)" // yellow highlight
            stroke={objectColor}
            strokeWidth="5"
            opacity="1"
          />
        </g>
      )}
    </svg>
  );
}
