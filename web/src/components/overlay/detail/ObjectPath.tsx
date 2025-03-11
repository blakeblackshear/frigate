import { useCallback } from "react";
import { LifecycleClassType, Position } from "@/types/timeline";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { getLifecycleItemDescription } from "@/utils/lifecycleUtil";

type ObjectPathProps = {
  positions?: Position[];
  color?: number[];
  width?: number;
  pointRadius?: number;
  imgRef: React.RefObject<HTMLImageElement>;
  onPointClick?: (index: number) => void;
  visible?: boolean;
};

const typeColorMap: Partial<
  Record<LifecycleClassType, [number, number, number]>
> = {
  [LifecycleClassType.VISIBLE]: [0, 255, 0], // Green
  [LifecycleClassType.GONE]: [255, 0, 0], // Red
  [LifecycleClassType.ENTERED_ZONE]: [255, 165, 0], // Orange
  [LifecycleClassType.ATTRIBUTE]: [128, 0, 128], // Purple
  [LifecycleClassType.ACTIVE]: [255, 255, 0], // Yellow
  [LifecycleClassType.STATIONARY]: [128, 128, 128], // Gray
  [LifecycleClassType.HEARD]: [0, 255, 255], // Cyan
  [LifecycleClassType.EXTERNAL]: [165, 42, 42], // Brown
};

export function ObjectPath({
  positions,
  color = [0, 0, 255],
  width = 2,
  pointRadius = 4,
  imgRef,
  onPointClick,
  visible = true,
}: ObjectPathProps) {
  const getAbsolutePositions = useCallback(() => {
    if (!imgRef.current || !positions) return [];
    const imgRect = imgRef.current.getBoundingClientRect();
    return positions.map((pos) => ({
      x: pos.x * imgRect.width,
      y: pos.y * imgRect.height,
      timestamp: pos.timestamp,
      lifecycle_item: pos.lifecycle_item,
    }));
  }, [positions, imgRef]);

  const generateStraightPath = useCallback((points: Position[]) => {
    if (!points || points.length < 2) return "";
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  }, []);

  const getPointColor = (baseColor: number[], type?: LifecycleClassType) => {
    if (type) {
      const typeColor = typeColorMap[type];
      if (typeColor) {
        return `rgb(${typeColor.join(",")})`;
      }
    }
    // normal path point
    return `rgb(${baseColor.map((c) => Math.max(0, c - 10)).join(",")})`;
  };

  if (!imgRef.current || !visible) return null;
  const absolutePositions = getAbsolutePositions();
  const lineColor = `rgb(${color.join(",")})`;

  return (
    <g>
      <path
        d={generateStraightPath(absolutePositions)}
        fill="none"
        stroke={lineColor}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {absolutePositions.map((pos, index) => (
        <Tooltip key={`point-${index}`}>
          <TooltipTrigger asChild>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={pointRadius}
              fill={getPointColor(color, pos.lifecycle_item?.class_type)}
              stroke="white"
              strokeWidth={width / 2}
              onClick={() =>
                pos.lifecycle_item && onPointClick && onPointClick(index)
              }
              style={{ cursor: pos.lifecycle_item ? "pointer" : "default" }}
            />
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="top" className="capitalize">
              {pos.lifecycle_item
                ? getLifecycleItemDescription(pos.lifecycle_item)
                : "Tracked point"}
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      ))}
    </g>
  );
}
