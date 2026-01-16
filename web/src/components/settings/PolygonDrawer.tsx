import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Line, Circle, Group, Text, Rect } from "react-konva";
import {
  minMax,
  toRGBColorString,
  dragBoundFunc,
  flattenPoints,
} from "@/utils/canvasUtil";
import type { KonvaEventObject } from "konva/lib/Node";
import Konva from "konva";
import { Vector2d } from "konva/lib/types";

type PolygonDrawerProps = {
  stageRef: RefObject<Konva.Stage>;
  points: number[][];
  distances: number[];
  isActive: boolean;
  isHovered: boolean;
  isFinished: boolean;
  enabled?: boolean;
  color: number[];
  handlePointDragMove: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  handleGroupDragEnd: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  activeLine?: number;
  snapToLines: (point: number[]) => number[] | null;
  snapPoints: boolean;
};

export default function PolygonDrawer({
  stageRef,
  points,
  distances,
  isActive,
  isHovered,
  isFinished,
  enabled = true,
  color,
  handlePointDragMove,
  handleGroupDragEnd,
  activeLine,
  snapToLines,
  snapPoints,
}: PolygonDrawerProps) {
  const vertexRadius = 6;
  const flattenedPoints = useMemo(() => flattenPoints(points), [points]);
  const [minMaxX, setMinMaxX] = useState([0, 0]);
  const [minMaxY, setMinMaxY] = useState([0, 0]);
  const groupRef = useRef<Konva.Group>(null);
  const [cursor, setCursor] = useState("default");

  const handleMouseOverPoint = (
    e: KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (!e.target) return;

    if (!isFinished && points.length >= 3 && e.target.name() === "point-0") {
      e.target.scale({ x: 2, y: 2 });
      setCursor("crosshair");
    } else {
      setCursor("move");
    }
  };

  const handleMouseOutPoint = (
    e: KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (!e.target) return;

    if (isFinished) {
      setCursor("default");
    } else {
      setCursor("crosshair");
    }

    if (e.target.name() === "point-0") {
      e.target.scale({ x: 1, y: 1 });
    }
  };

  const handleGroupDragStart = () => {
    const arrX = points.map((p) => p[0]);
    const arrY = points.map((p) => p[1]);
    setMinMaxX(minMax(arrX));
    setMinMaxY(minMax(arrY));
  };

  const groupDragBound = (pos: Vector2d) => {
    if (!stageRef.current) {
      return pos;
    }

    let { x, y } = pos;
    const sw = stageRef.current.width();
    const sh = stageRef.current.height();

    if (minMaxY[0] + y < 0) y = -1 * minMaxY[0];
    if (minMaxX[0] + x < 0) x = -1 * minMaxX[0];
    if (minMaxY[1] + y > sh) y = sh - minMaxY[1];
    if (minMaxX[1] + x > sw) x = sw - minMaxX[1];

    return { x, y };
  };

  const colorString = useCallback(
    (darkened: boolean) => {
      if (!enabled) {
        // Slightly desaturate the color when disabled
        const avg = (color[0] + color[1] + color[2]) / 3;
        const desaturated = color.map((c) => Math.round(c * 0.4 + avg * 0.6));
        return toRGBColorString(desaturated, darkened);
      }
      return toRGBColorString(color, darkened);
    },
    [color, enabled],
  );

  useEffect(() => {
    if (!stageRef.current) {
      return;
    }

    stageRef.current.container().style.cursor = cursor;
  }, [stageRef, cursor]);

  // Calculate midpoints for distance labels based on sorted points
  const midpoints = useMemo(() => {
    const midpointsArray = [];
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const midpointX = (p1[0] + p2[0]) / 2;
      const midpointY = (p1[1] + p2[1]) / 2;
      midpointsArray.push([midpointX, midpointY]);
    }
    return midpointsArray;
  }, [points]);

  // Determine the points for the active line
  const activeLinePoints = useMemo(() => {
    if (
      activeLine === undefined ||
      activeLine < 1 ||
      activeLine > points.length
    ) {
      return [];
    }
    const p1 = points[activeLine - 1];
    const p2 = points[activeLine % points.length];
    return [p1[0], p1[1], p2[0], p2[1]];
  }, [activeLine, points]);

  return (
    <Group
      name="polygon"
      ref={groupRef}
      draggable={isActive && isFinished}
      onDragStart={isActive ? handleGroupDragStart : undefined}
      onDragEnd={isActive ? handleGroupDragEnd : undefined}
      dragBoundFunc={isActive ? groupDragBound : undefined}
    >
      <Line
        name="filled-line"
        points={flattenedPoints}
        stroke={colorString(true)}
        strokeWidth={3}
        dash={enabled ? undefined : [10, 5]}
        hitStrokeWidth={12}
        closed={isFinished}
        fill={colorString(isActive || isHovered ? true : false)}
        opacity={enabled ? 1 : 0.85}
        onMouseOver={() =>
          isActive
            ? isFinished
              ? setCursor("move")
              : setCursor("crosshair")
            : setCursor("default")
        }
        onMouseOut={() =>
          isActive
            ? isFinished
              ? setCursor("default")
              : setCursor("crosshair")
            : setCursor("default")
        }
      />
      {isFinished && isActive && (
        <Line
          name="unfilled-line"
          points={flattenedPoints}
          hitStrokeWidth={12}
          closed={isFinished}
          fillEnabled={false}
          onMouseOver={() => setCursor("crosshair")}
          onMouseOut={() =>
            isFinished ? setCursor("default") : setCursor("crosshair")
          }
        />
      )}
      {isActive && activeLinePoints.length > 0 && (
        <Line
          points={activeLinePoints}
          stroke="white"
          strokeWidth={6}
          hitStrokeWidth={12}
        />
      )}
      {points.map((point, index) => {
        if (!isActive) {
          return;
        }
        const x = point[0];
        const y = point[1];

        return (
          <Circle
            key={index}
            name={`point-${index}`}
            x={x}
            y={y}
            radius={vertexRadius}
            stroke={colorString(true)}
            fill="#ffffff"
            strokeWidth={3}
            hitStrokeWidth={index === 0 ? 12 : 9}
            onMouseOver={handleMouseOverPoint}
            onMouseOut={handleMouseOutPoint}
            draggable={isActive}
            onDragMove={(e) => {
              if (isActive) {
                if (snapPoints) {
                  const snappedPos = snapToLines([e.target.x(), e.target.y()]);
                  if (snappedPos) {
                    e.target.position({ x: snappedPos[0], y: snappedPos[1] });
                  }
                }
                handlePointDragMove(e);
              }
            }}
            dragBoundFunc={(pos) => {
              if (stageRef.current) {
                const boundPos = dragBoundFunc(
                  stageRef.current.width(),
                  stageRef.current.height(),
                  vertexRadius,
                  pos,
                );
                if (snapPoints) {
                  const snappedPos = snapToLines([boundPos.x, boundPos.y]);
                  return snappedPos
                    ? { x: snappedPos[0], y: snappedPos[1] }
                    : boundPos;
                }
                return boundPos;
              } else {
                return pos;
              }
            }}
          />
        );
      })}
      {isFinished && (
        <Group>
          {midpoints.map((midpoint, index) => {
            const [x, y] = midpoint;
            const distance = distances[index];
            if (distance === undefined) return null;

            const squareSize = 22;

            return (
              <Group
                key={`distance-group-${index}`}
                x={x - squareSize / 2}
                y={y - squareSize / 2}
              >
                <Rect
                  width={squareSize}
                  height={squareSize}
                  fill={colorString(true)}
                  stroke="white"
                  strokeWidth={1}
                />
                <Text
                  text={`${distance}`}
                  width={squareSize}
                  y={4}
                  fontSize={16}
                  fontFamily="Arial"
                  fill="white"
                  align="center"
                  verticalAlign="middle"
                />
              </Group>
            );
          })}
        </Group>
      )}
    </Group>
  );
}
