import { useCallback, useMemo, useRef, useState } from "react";
import { Line, Circle, Group } from "react-konva";
import {
  minMax,
  toRGBColorString,
  dragBoundFunc,
  flattenPoints,
} from "@/utils/canvasUtil";
import type { KonvaEventObject } from "konva/lib/Node";
import Konva from "konva";
import { Vector2d } from "konva/lib/types";
import { isMobileOnly } from "react-device-detect";

type PolygonDrawerProps = {
  points: number[][];
  isActive: boolean;
  isHovered: boolean;
  isFinished: boolean;
  color: number[];
  handlePointDragMove: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  handleGroupDragEnd: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  handleMouseOverStartPoint: (
    e: KonvaEventObject<MouseEvent | TouchEvent>,
  ) => void;
  handleMouseOutStartPoint: (
    e: KonvaEventObject<MouseEvent | TouchEvent>,
  ) => void;
  handleMouseOverAnyPoint: (
    e: KonvaEventObject<MouseEvent | TouchEvent>,
  ) => void;
  handleMouseOutAnyPoint: (
    e: KonvaEventObject<MouseEvent | TouchEvent>,
  ) => void;
};

export default function PolygonDrawer({
  points,
  isActive,
  isHovered,
  isFinished,
  color,
  handlePointDragMove,
  handleGroupDragEnd,
  handleMouseOverStartPoint,
  handleMouseOutStartPoint,
  handleMouseOverAnyPoint,
  handleMouseOutAnyPoint,
}: PolygonDrawerProps) {
  const vertexRadius = isMobileOnly ? 12 : 6;
  const flattenedPoints = useMemo(() => flattenPoints(points), [points]);
  const [stage, setStage] = useState<Konva.Stage>();
  const [minMaxX, setMinMaxX] = useState([0, 0]);
  const [minMaxY, setMinMaxY] = useState([0, 0]);
  const groupRef = useRef<Konva.Group>(null);

  const handleGroupMouseOver = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (!isFinished) return;
    e.target.getStage()!.container().style.cursor = "move";
    setStage(e.target.getStage()!);
  };

  const handleGroupMouseOut = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (!e.target || !isFinished) return;
    e.target.getStage()!.container().style.cursor = "default";
  };

  const handleGroupDragStart = () => {
    const arrX = points.map((p) => p[0]);
    const arrY = points.map((p) => p[1]);
    setMinMaxX(minMax(arrX));
    setMinMaxY(minMax(arrY));
  };

  const groupDragBound = (pos: Vector2d) => {
    if (!stage) {
      return pos;
    }

    let { x, y } = pos;
    const sw = stage.width();
    const sh = stage.height();

    if (minMaxY[0] + y < 0) y = -1 * minMaxY[0];
    if (minMaxX[0] + x < 0) x = -1 * minMaxX[0];
    if (minMaxY[1] + y > sh) y = sh - minMaxY[1];
    if (minMaxX[1] + x > sw) x = sw - minMaxX[1];

    return { x, y };
  };

  const colorString = useCallback(
    (darkened: boolean) => {
      return toRGBColorString(color, darkened);
    },
    [color],
  );

  return (
    <Group
      name="polygon"
      ref={groupRef}
      draggable={isActive && isFinished}
      onDragStart={isActive ? handleGroupDragStart : undefined}
      onDragEnd={isActive ? handleGroupDragEnd : undefined}
      dragBoundFunc={isActive ? groupDragBound : undefined}
      onMouseOver={isActive ? handleGroupMouseOver : undefined}
      onTouchStart={isActive ? handleGroupMouseOver : undefined}
      onMouseOut={isActive ? handleGroupMouseOut : undefined}
    >
      <Line
        points={flattenedPoints}
        stroke={colorString(true)}
        strokeWidth={3}
        closed={isFinished}
        fill={colorString(isActive || isHovered ? true : false)}
      />
      {points.map((point, index) => {
        if (!isActive) {
          return;
        }
        const x = point[0];
        const y = point[1];
        const startPointAttr =
          index === 0
            ? {
                hitStrokeWidth: 12,
                onMouseOver: handleMouseOverStartPoint,
                onMouseOut: handleMouseOutStartPoint,
              }
            : null;
        const otherPointsAttr =
          index !== 0
            ? {
                onMouseOver: handleMouseOverAnyPoint,
                onMouseOut: handleMouseOutAnyPoint,
              }
            : null;

        return (
          <Circle
            key={index}
            x={x}
            y={y}
            radius={vertexRadius}
            stroke={colorString(true)}
            fill="#ffffff"
            strokeWidth={3}
            draggable={isActive}
            onDragMove={isActive ? handlePointDragMove : undefined}
            dragBoundFunc={(pos) => {
              if (stage) {
                return dragBoundFunc(
                  stage.width(),
                  stage.height(),
                  vertexRadius,
                  pos,
                );
              } else {
                return pos;
              }
            }}
            {...startPointAttr}
            {...otherPointsAttr}
          />
        );
      })}
    </Group>
  );
}
