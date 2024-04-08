import { useState } from "react";
import { Line, Circle, Group } from "react-konva";
import { minMax, dragBoundFunc } from "@/utils/canvasUtil";
import type { KonvaEventObject } from "konva/lib/Node";
import Konva from "konva";
import { Vector2d } from "konva/lib/types";

type PolygonDrawerProps = {
  points: number[][];
  flattenedPoints: number[];
  isActive: boolean;
  isFinished: boolean;
  handlePointDragMove: (e: KonvaEventObject<MouseEvent>) => void;
  handleGroupDragEnd: (e: KonvaEventObject<MouseEvent>) => void;
  handleMouseOverStartPoint: (e: KonvaEventObject<MouseEvent>) => void;
  handleMouseOutStartPoint: (e: KonvaEventObject<MouseEvent>) => void;
};

export default function PolygonDrawer({
  points,
  flattenedPoints,
  isActive,
  isFinished,
  handlePointDragMove,
  handleGroupDragEnd,
  handleMouseOverStartPoint,
  handleMouseOutStartPoint,
}: PolygonDrawerProps) {
  const vertexRadius = 6;
  const [stage, setStage] = useState<Konva.Stage>();
  const [minMaxX, setMinMaxX] = useState([0, 0]);
  const [minMaxY, setMinMaxY] = useState([0, 0]);

  const handleGroupMouseOver = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isFinished) return;
    e.target.getStage()!.container().style.cursor = "move";
    setStage(e.target.getStage()!);
  };

  const handleGroupMouseOut = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!e.target) return;
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

  return (
    <Group
      name="polygon"
      draggable={isActive && isFinished}
      onDragStart={isActive ? handleGroupDragStart : undefined}
      onDragEnd={isActive ? handleGroupDragEnd : undefined}
      dragBoundFunc={isActive ? groupDragBound : undefined}
      onMouseOver={isActive ? handleGroupMouseOver : undefined}
      onMouseOut={isActive ? handleGroupMouseOut : undefined}
    >
      <Line
        points={flattenedPoints}
        stroke="#aa0000"
        strokeWidth={3}
        closed={isFinished}
        fill="rgb(220,0,0,0.5)"
      />
      {points.map((point, index) => {
        if (!isActive) {
          return;
        }
        const x = point[0] - vertexRadius / 2;
        const y = point[1] - vertexRadius / 2;
        const startPointAttr =
          index === 0
            ? {
                hitStrokeWidth: 12,
                onMouseOver: handleMouseOverStartPoint,
                onMouseOut: handleMouseOutStartPoint,
              }
            : null;

        return (
          <Circle
            key={index}
            x={x}
            y={y}
            radius={vertexRadius}
            fill="#dd0000"
            stroke="#cccccc"
            strokeWidth={2}
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
          />
        );
      })}
    </Group>
  );
}