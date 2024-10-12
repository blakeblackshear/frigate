import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

type PolygonDrawerProps = {
  stageRef: RefObject<Konva.Stage>;
  points: number[][];
  isActive: boolean;
  isHovered: boolean;
  isFinished: boolean;
  color: number[];
  handlePointDragMove: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  handleGroupDragEnd: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
};

export default function PolygonDrawer({
  stageRef,
  points,
  isActive,
  isHovered,
  isFinished,
  color,
  handlePointDragMove,
  handleGroupDragEnd,
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
      return toRGBColorString(color, darkened);
    },
    [color],
  );

  useEffect(() => {
    if (!stageRef.current) {
      return;
    }

    stageRef.current.container().style.cursor = cursor;
  }, [stageRef, cursor]);

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
        hitStrokeWidth={12}
        closed={isFinished}
        fill={colorString(isActive || isHovered ? true : false)}
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
            onDragMove={isActive ? handlePointDragMove : undefined}
            dragBoundFunc={(pos) => {
              if (stageRef.current) {
                return dragBoundFunc(
                  stageRef.current.width(),
                  stageRef.current.height(),
                  vertexRadius,
                  pos,
                );
              } else {
                return pos;
              }
            }}
          />
        );
      })}
    </Group>
  );
}
